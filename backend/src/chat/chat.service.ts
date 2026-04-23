import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessageParserService, ParsedTransaction } from './message-parser.service';
import { LlmService } from './llm.service';
import { TransactionsService } from '../transactions/transactions.service';
import { FamilyService } from '../family/family.service';
import { User } from '../schemas/user.schema';
import { Family } from '../schemas/family.schema';

export interface ChatParseResponse {
  success: boolean;
  parsed?: ParsedTransaction;
  message: string;
  source: 'regex' | 'llm' | 'none';
  skipConfirmation?: boolean;
}

export interface ChatConfirmRequest {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
  bankAccount?: string;
  isFixed?: boolean;
  language?: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private messageParser: MessageParserService,
    private llmService: LlmService,
    private transactionsService: TransactionsService,
    private familyService: FamilyService,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Family.name) private familyModel: Model<Family>,
  ) {}

  async parseMessage(
    message: string,
    user: any,
    language: string,
    context?: { role: string; content: string }[],
  ): Promise<ChatParseResponse> {
    if (!message || !message.trim()) {
      const isPt = language?.startsWith('pt');
      return {
        success: false,
        message: isPt
          ? 'Mensagem vazia. Envie algo como "gastei 50 no mercado".'
          : 'Empty message. Try something like "spent 50 on groceries".',
        source: 'none',
      };
    }

    const trimmed = message.trim();
    const isPt = language?.startsWith('pt');

    const familyId = user.familyId?.toString() || null;
    const categories = await this.transactionsService.getCategories(familyId, user._id.toString());
    const bankAccounts = await this.getBankAccounts(familyId, user._id.toString());

    const looksLikeCorrection = this.isCorrection(trimmed);

    if (!looksLikeCorrection) {
      const regexResult = this.messageParser.parse(trimmed, categories, bankAccounts);
      if (regexResult) {
        this.logger.log(`Regex parsed: ${JSON.stringify(regexResult)}`);
        return {
          success: true,
          parsed: regexResult,
          message: this.buildConfirmationMessage(regexResult, language),
          source: 'regex',
          skipConfirmation: user.skipChatConfirmation || false,
        };
      }
    }

    if (this.llmService.isAvailable()) {
      const llmResult = await this.llmService.parse(
        trimmed,
        language,
        categories,
        bankAccounts,
        context,
      );
      if (llmResult) {
        if (llmResult.category && !categories.includes(llmResult.category)) {
          llmResult.category = 'Other';
        }

        this.logger.log(`LLM parsed: ${JSON.stringify(llmResult)}`);
        return {
          success: true,
          parsed: llmResult,
          message: this.buildConfirmationMessage(llmResult, language),
          source: 'llm',
          skipConfirmation: user.skipChatConfirmation || false,
        };
      }
    }

    return {
      success: false,
      message: isPt
        ? 'Não consegui entender sua mensagem. Tente algo como:\n• "gastei 50 no mercado"\n• "recebi 2000 de salário"\n• "paguei 120 de luz ontem"'
        : 'I couldn\'t understand your message. Try something like:\n• "spent 50 on groceries"\n• "received 2000 salary"\n• "paid 120 electricity bill yesterday"',
      source: 'none',
    };
  }

  async confirmTransaction(data: ChatConfirmRequest, user: any): Promise<any> {
    const familyId = user.familyId?.toString() || null;
    let bankAccountCreated = false;

    if (data.bankAccount && data.bankAccount.trim()) {
      const existingAccounts = await this.getBankAccounts(familyId, user._id.toString());
      const normalized = data.bankAccount.trim();

      if (!existingAccounts.some(a => a.toLowerCase() === normalized.toLowerCase())) {
        try {
          await this.familyService.addBankAccount(familyId, user._id.toString(), normalized);
          bankAccountCreated = true;
          this.logger.log(`Auto-created bank account: ${normalized}`);
        } catch (err) {
          this.logger.warn(`Failed to auto-create bank account: ${err.message}`);
        }
      }
    }

    const transactionData = {
      description: data.description,
      amount: data.amount,
      type: data.type,
      category: data.category || 'Other',
      date: new Date(data.date),
      bankAccount: data.bankAccount || undefined,
      isFixed: data.isFixed || false,
    };

    const result = await this.transactionsService.create(
      transactionData,
      user._id.toString(),
      familyId,
    );

    return { ...result, bankAccountCreated };
  }

  private isCorrection(message: string): boolean {
  const correctionPatterns = [
    /^na verdade/i,
    /^corrij/i,
    /^err[aoe]i/i,
    /^foi\s+\d/i,
    /^não.*era/i,
    /^o valor/i,
    /^o certo/i,
    /^actually/i,
    /^correction/i,
    /^it was/i,
    /^sorry.*meant/i,
    /^no,?\s/i,
    /^-?\d+([.,]\d+)?$/ 
  ];
  return correctionPatterns.some((p) => p.test(message.trim()));
}

  private async getBankAccounts(familyId: string | null, userId: string): Promise<string[]> {
    if (familyId) {
      const family = await this.familyModel.findById(familyId).exec();
      return family?.bankAccounts || [];
    }
    const user = await this.userModel.findById(userId).exec();
    return user?.bankAccounts || [];
  }

  private buildConfirmationMessage(parsed: ParsedTransaction, language: string): string {
    const isPt = language?.startsWith('pt');
    const typeLabel = isPt
      ? (parsed.type === 'income' ? 'Receita' : 'Despesa')
      : (parsed.type === 'income' ? 'Income' : 'Expense');

    const dateStr = parsed.date
      ? new Date(parsed.date).toLocaleDateString(isPt ? 'pt-BR' : 'en-US')
      : new Date().toLocaleDateString(isPt ? 'pt-BR' : 'en-US');

    const amountStr = isPt
      ? `R$ ${parsed.amount.toFixed(2).replace('.', ',')}`
      : `$${parsed.amount.toFixed(2)}`;

    const categoryLabel = parsed.category || (isPt ? 'Outros' : 'Other');
    const bankLine = parsed.bankAccount
      ? (isPt ? `\n• Conta: ${parsed.bankAccount}` : `\n• Account: ${parsed.bankAccount}`)
      : '';

    if (isPt) {
      return `Entendi:\n• Tipo: ${typeLabel}\n• Valor: ${amountStr}\n• Descrição: ${parsed.description}\n• Categoria: ${categoryLabel}${bankLine}\n• Data: ${dateStr}\n\nConfirma?`;
    }

    return `Got it:\n• Type: ${typeLabel}\n• Amount: ${amountStr}\n• Description: ${parsed.description}\n• Category: ${categoryLabel}${bankLine}\n• Date: ${dateStr}\n\nConfirm?`;
  }
}
