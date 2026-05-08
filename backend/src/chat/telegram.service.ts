import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatService } from './chat.service';
import { User } from '../schemas/user.schema';
import { TelegramLink } from '../schemas/telegram-link.schema';

interface PendingTransaction {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
  bankAccount?: string;
  isFixed?: boolean;
}

interface ConversationState {
  pending: PendingTransaction | null;
  context: { role: string; content: string }[];
  lastActivity: number;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly conversations = new Map<number, ConversationState>();
  private readonly CONTEXT_LIMIT = 10;
  private readonly STATE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  constructor(
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(TelegramLink.name) private readonly telegramLinkModel: Model<TelegramLink>,
  ) {}


  async handleMessage(chatId: number, text: string): Promise<void> {
    const botToken = this.getBotToken();
    if (!botToken) return;

    const trimmed = text?.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('/')) {
      await this.handleCommand(botToken, chatId, trimmed);
      return;
    }

    const user = await this.getLinkedUser(chatId);
    if (!user) {
      await this.sendUnlinkedMessage(botToken, chatId);
      return;
    }

    const lang = user.preferredLanguage || 'pt-BR';
    const isPt = lang.startsWith('pt');

    const state = this.getState(chatId);

    // Invalidate any pending transaction (same behavior as frontend)
    state.pending = null;

    state.context.push({ role: 'user', content: trimmed });
    if (state.context.length > this.CONTEXT_LIMIT) {
      state.context = state.context.slice(-this.CONTEXT_LIMIT);
    }

    try {
      const result = await this.chatService.parseMessage(trimmed, user, lang, state.context);

      if (result.success && result.parsed) {
        state.context.push({ role: 'assistant', content: result.message });

        if (result.skipConfirmation) {
          await this.confirmTransaction(botToken, chatId, user, lang, {
            type: result.parsed.type,
            amount: result.parsed.amount,
            description: result.parsed.description,
            category: result.parsed.category || 'Other',
            date: result.parsed.date || new Date().toISOString(),
            bankAccount: result.parsed.bankAccount,
          });
        } else {
          state.pending = {
            type: result.parsed.type,
            amount: result.parsed.amount,
            description: result.parsed.description,
            category: result.parsed.category || 'Other',
            date: result.parsed.date || new Date().toISOString(),
            bankAccount: result.parsed.bankAccount,
          };

          const keyboard = this.buildConfirmKeyboard(isPt);
          await this.sendMessage(botToken, chatId, result.message, keyboard);
        }
      } else {
        state.context.push({ role: 'assistant', content: result.message });
        await this.sendMessage(botToken, chatId, result.message);
      }
    } catch (error) {
      this.logger.error(`Error processing message from chat ${chatId}: ${error.message}`);
      const errorMsg = isPt
        ? '❌ Ocorreu um erro ao processar sua mensagem. Tente novamente.'
        : '❌ An error occurred while processing your message. Please try again.';
      await this.sendMessage(botToken, chatId, errorMsg);
    }
  }

  async handleCallbackQuery(
    callbackQueryId: string,
    chatId: number,
    messageId: number,
    data: string,
  ): Promise<void> {
    const botToken = this.getBotToken();
    if (!botToken) return;

    const user = await this.getLinkedUser(chatId);
    if (!user) {
      await this.answerCallbackQuery(botToken, callbackQueryId, '⚠️ Account not linked');
      return;
    }

    const lang = user.preferredLanguage || 'pt-BR';
    const isPt = lang.startsWith('pt');
    const state = this.getState(chatId);

    if (data === 'confirm_transaction') {
      if (!state.pending) {
        const msg = isPt
          ? '⚠️ Nenhuma transação pendente para confirmar.'
          : '⚠️ No pending transaction to confirm.';
        await this.answerCallbackQuery(botToken, callbackQueryId, msg);
        return;
      }

      await this.answerCallbackQuery(botToken, callbackQueryId, '⏳');

      await this.confirmTransaction(botToken, chatId, user, lang, state.pending);

      await this.editMessageReplyMarkup(botToken, chatId, messageId);
      state.pending = null;

    } else if (data === 'cancel_transaction') {
      state.pending = null;

      const msg = isPt ? '❌ Transação cancelada.' : '❌ Transaction cancelled.';
      await this.answerCallbackQuery(botToken, callbackQueryId, msg);
      await this.sendMessage(botToken, chatId, msg);

      await this.editMessageReplyMarkup(botToken, chatId, messageId);
    }
  }


  private async handleCommand(botToken: string, chatId: number, text: string): Promise<void> {
    const parts = text.split(/\s+/);
    const command = parts[0].toLowerCase().replace(/@\w+$/, ''); // Remove @botname suffix

    switch (command) {
      case '/start':
        await this.handleStartCommand(botToken, chatId, parts.slice(1).join(' '));
        break;
      case '/help':
        await this.handleHelpCommand(botToken, chatId);
        break;
      case '/status':
        await this.handleStatusCommand(botToken, chatId);
        break;
      case '/desvincular':
      case '/unlink':
        await this.handleUnlinkCommand(botToken, chatId);
        break;
      default:
        await this.handleHelpCommand(botToken, chatId);
        break;
    }
  }

  private async handleStartCommand(botToken: string, chatId: number, token: string): Promise<void> {
    const existingLink = await this.telegramLinkModel.findOne({ telegramChatId: chatId }).exec();

    if (existingLink) {
      const user = await this.userModel.findById(existingLink.userId).exec();
      const name = user?.name || 'usuário';
      await this.sendMessage(
        botToken,
        chatId,
        `✅ Sua conta já está vinculada como ${name}.\n\n`
          + `Envie uma mensagem como "gastei 50 no mercado" para registrar uma transação.\n\n`
          + `📊 Acesse seus relatórios: ${this.getFrontendUrl()}`,
      );
      return;
    }

    if (!token || !token.trim()) {
      await this.sendMessage(
        botToken,
        chatId,
        `👋 Bem-vindo ao VerdantCash Bot!\n\n`
          + `Para vincular sua conta, gere um token no site e envie aqui:\n\n`
          + `1️⃣ Acesse ${this.getFrontendUrl()}\n`
          + `2️⃣ Vá em Perfil → Vincular Telegram\n`
          + `3️⃣ Copie o token gerado\n`
          + `4️⃣ Envie aqui: /start SEU_TOKEN\n\n`
          + `Ou use o link direto gerado no site.`,
      );
      return;
    }

    const user = await this.userModel.findOne({
      telegramLinkToken: token.trim(),
      telegramLinkTokenExpiresAt: { $gt: new Date() },
    }).exec();

    if (!user) {
      await this.sendMessage(
        botToken,
        chatId,
        '❌ Token inválido ou expirado. Gere um novo token no site.',
      );
      return;
    }

    await this.telegramLinkModel.create({
      telegramChatId: chatId,
      userId: user._id,
      language: user.preferredLanguage || 'pt-BR',
    });

    user.telegramChatId = chatId;
    user.telegramLinkToken = null;
    user.telegramLinkTokenExpiresAt = null;
    await user.save();

    this.logger.log(`Linked Telegram chat ${chatId} to user ${user._id} (${user.email})`);

    const isPt = (user.preferredLanguage || 'pt-BR').startsWith('pt');

    if (isPt) {
      await this.sendMessage(
        botToken,
        chatId,
        `✅ Conta vinculada com sucesso, ${user.name}! 🎉\n\n`
          + `Agora você pode registrar transações diretamente aqui. Exemplos:\n`
          + `• "gastei 50 no mercado"\n`
          + `• "recebi 2000 de salário"\n`
          + `• "paguei 120 de luz ontem"\n\n`
          + `📊 Acesse seus relatórios: ${this.getFrontendUrl()}\n\n`
          + `Digite /help para ver todos os comandos.`,
      );
    } else {
      await this.sendMessage(
        botToken,
        chatId,
        `✅ Account linked successfully, ${user.name}! 🎉\n\n`
          + `You can now register transactions directly here. Examples:\n`
          + `• "spent 50 on groceries"\n`
          + `• "received 2000 salary"\n`
          + `• "paid 120 electricity bill yesterday"\n\n`
          + `📊 View your reports: ${this.getFrontendUrl()}\n\n`
          + `Type /help to see all commands.`,
      );
    }
  }

  private async handleHelpCommand(botToken: string, chatId: number): Promise<void> {
    const user = await this.getLinkedUser(chatId);
    const lang = user?.preferredLanguage || 'pt-BR';
    const isPt = lang.startsWith('pt');
    const frontendUrl = this.getFrontendUrl();

    if (isPt) {
      await this.sendMessage(
        botToken,
        chatId,
        `💡 Como usar o VerdantCash Bot\n\n`
          + `📝 Registrar transações:\n`
          + `Envie mensagens em linguagem natural:\n`
          + `• "gastei 50 no mercado"\n`
          + `• "recebi 3000 de salário na Nubank"\n`
          + `• "paguei 200 de internet ontem"\n\n`
          + `🔄 Correções:\n`
          + `• "na verdade foi 100"\n`
          + `• "o valor era 200"\n\n`
          + `⌨️ Comandos:\n`
          + `/start - Vincular conta\n`
          + `/status - Ver status da conta\n`
          + `/desvincular - Desvincular conta\n`
          + `/help - Esta mensagem\n\n`
          + `📊 Acessar Dashboard: ${frontendUrl}`,
      );
    } else {
      await this.sendMessage(
        botToken,
        chatId,
        `💡 How to use VerdantCash Bot\n\n`
          + `📝 Register transactions:\n`
          + `Send messages in natural language:\n`
          + `• "spent 50 on groceries"\n`
          + `• "received 3000 salary at Nubank"\n`
          + `• "paid 200 for internet yesterday"\n\n`
          + `🔄 Corrections:\n`
          + `• "actually it was 100"\n`
          + `• "the amount was 200"\n\n`
          + `⌨️ Commands:\n`
          + `/start - Link account\n`
          + `/status - Check account status\n`
          + `/unlink - Unlink account\n`
          + `/help - This message\n\n`
          + `📊 Access Dashboard: ${frontendUrl}`,
      );
    }
  }

  private async handleStatusCommand(botToken: string, chatId: number): Promise<void> {
    const user = await this.getLinkedUser(chatId);
    if (!user) {
      await this.sendUnlinkedMessage(botToken, chatId);
      return;
    }

    const isPt = (user.preferredLanguage || 'pt-BR').startsWith('pt');
    const frontendUrl = this.getFrontendUrl();

    if (isPt) {
      await this.sendMessage(
        botToken,
        chatId,
        `📋 *Status da Conta*\n\n`
          + `• Nome: ${user.name}\n`
          + `• Email: ${user.email}\n`
          + `• Idioma: ${user.preferredLanguage}\n\n`
          + `📊 Acesse seus relatórios: ${frontendUrl}`,
      );
    } else {
      await this.sendMessage(
        botToken,
        chatId,
        `📋 *Account Status*\n\n`
          + `• Name: ${user.name}\n`
          + `• Email: ${user.email}\n`
          + `• Language: ${user.preferredLanguage}\n\n`
          + `📊 View your reports: ${frontendUrl}`,
      );
    }
  }

  private async handleUnlinkCommand(botToken: string, chatId: number): Promise<void> {
    const link = await this.telegramLinkModel.findOneAndDelete({ telegramChatId: chatId }).exec();

    if (link) {
      await this.userModel.findByIdAndUpdate(link.userId, {
        telegramChatId: null,
      }).exec();

      this.conversations.delete(chatId);
      this.logger.log(`Unlinked Telegram chat ${chatId}`);

      await this.sendMessage(
        botToken,
        chatId,
        '✅ Conta desvinculada com sucesso. Use /start para vincular novamente.',
      );
    } else {
      await this.sendMessage(
        botToken,
        chatId,
        '⚠️ Nenhuma conta vinculada encontrada.',
      );
    }
  }


  private async confirmTransaction(
    botToken: string,
    chatId: number,
    user: any,
    lang: string,
    data: PendingTransaction,
  ): Promise<void> {
    const isPt = lang.startsWith('pt');

    try {
      const result = await this.chatService.confirmTransaction(
        {
          type: data.type,
          amount: data.amount,
          description: data.description,
          category: data.category,
          date: data.date,
          bankAccount: data.bankAccount,
          isFixed: data.isFixed,
          language: lang,
        },
        user,
      );

      const state = this.getState(chatId);
      const successMsg = isPt
        ? '✅ Transação salva com sucesso!'
        : '✅ Transaction saved successfully!';
      state.context.push({ role: 'assistant', content: successMsg });

      let fullMsg = successMsg;

      if (result.bankAccountCreated) {
        const bankMsg = isPt
          ? `\n💳 Conta bancária "${data.bankAccount}" criada automaticamente.`
          : `\n💳 Bank account "${data.bankAccount}" auto-created.`;
        fullMsg += bankMsg;
      }

      if (result.alert) {
        fullMsg += `\n\n⚠️ ${result.alert}`;
      }

      fullMsg += isPt
        ? `\n\n📊 Veja no dashboard: ${this.getFrontendUrl()}`
        : `\n\n📊 View on dashboard: ${this.getFrontendUrl()}`;

      await this.sendMessage(botToken, chatId, fullMsg);

    } catch (error) {
      this.logger.error(`Error confirming transaction for chat ${chatId}: ${error.message}`);
      const errorMsg = isPt
        ? '❌ Erro ao salvar a transação. Tente novamente.'
        : '❌ Error saving transaction. Please try again.';
      await this.sendMessage(botToken, chatId, errorMsg);
    }
  }


  private async sendMessage(
    token: string,
    chatId: number,
    text: string,
    replyMarkup?: any,
    parseMode?: string,
  ): Promise<void> {
    try {
      const body: any = { chat_id: chatId, text };
      if (replyMarkup) body.reply_markup = replyMarkup;
      if (parseMode) body.parse_mode = parseMode;

      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.warn(`Telegram sendMessage failed: ${response.status} - ${JSON.stringify(errorData)}`);

        // If MarkdownV2 fails, retry without parse mode
        if (parseMode === 'MarkdownV2') {
          const plainText = text
            .replace(/\\([_*\[\]()~`>#+\-=|{}.!])/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1');
          await this.sendMessage(token, chatId, plainText, replyMarkup);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send Telegram message: ${error.message}`);
    }
  }

  private async answerCallbackQuery(
    token: string,
    callbackQueryId: string,
    text: string,
  ): Promise<void> {
    try {
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text,
        }),
      });
    } catch (error) {
      this.logger.error(`Failed to answer callback query: ${error.message}`);
    }
  }

  private async editMessageReplyMarkup(
    token: string,
    chatId: number,
    messageId: number,
  ): Promise<void> {
    try {
      await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] },
        }),
      });
    } catch (error) {
      this.logger.error(`Failed to edit message reply markup: ${error.message}`);
    }
  }

  async setupWebhook(webhookUrl: string): Promise<any> {
    const botToken = this.getBotToken();
    if (!botToken) {
      return { ok: false, description: 'Bot token not configured' };
    }

    const secret = this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET') || '';

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          ...(secret && { secret_token: secret }),
          allowed_updates: ['message', 'callback_query'],
        }),
      });

      const data = await response.json();
      this.logger.log(`Webhook setup result: ${JSON.stringify(data)}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to setup webhook: ${error.message}`);
      return { ok: false, description: error.message };
    }
  }

  async getWebhookInfo(): Promise<any> {
    const botToken = this.getBotToken();
    if (!botToken) {
      return { ok: false, description: 'Bot token not configured' };
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      return await response.json();
    } catch (error) {
      return { ok: false, description: error.message };
    }
  }


  private getState(chatId: number): ConversationState {
    const now = Date.now();

    // Clean up expired states periodically
    if (Math.random() < 0.1) {
      for (const [id, state] of this.conversations) {
        if (now - state.lastActivity > this.STATE_TTL_MS) {
          this.conversations.delete(id);
        }
      }
    }

    let state = this.conversations.get(chatId);
    if (!state || now - state.lastActivity > this.STATE_TTL_MS) {
      state = { pending: null, context: [], lastActivity: now };
      this.conversations.set(chatId, state);
    } else {
      state.lastActivity = now;
    }

    return state;
  }


  private async getLinkedUser(chatId: number): Promise<any | null> {
    const link = await this.telegramLinkModel.findOne({ telegramChatId: chatId }).exec();
    if (!link) return null;

    return this.userModel.findById(link.userId).exec();
  }

  private async sendUnlinkedMessage(botToken: string, chatId: number): Promise<void> {
    await this.sendMessage(
      botToken,
      chatId,
      `⚠️ Sua conta do Telegram não está vinculada.\n\n`
        + `Para começar:\n`
        + `1️⃣ Acesse ${this.getFrontendUrl()}\n`
        + `2️⃣ Vá em Perfil → Vincular Telegram\n`
        + `3️⃣ Copie o token e envie: /start SEU_TOKEN`,
    );
  }

  private buildConfirmKeyboard(isPt: boolean) {
    return {
      inline_keyboard: [
        [
          {
            text: isPt ? '✅ Confirmar' : '✅ Confirm',
            callback_data: 'confirm_transaction',
          },
          {
            text: isPt ? '❌ Cancelar' : '❌ Cancel',
            callback_data: 'cancel_transaction',
          },
        ],
      ],
    };
  }

  private getBotToken(): string | null {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token || token === 'token' || token.startsWith('your_')) {
      this.logger.warn('Telegram bot token not configured');
      return null;
    }
    return token;
  }

  private getFrontendUrl(): string {
    return this.configService.get<string>('FRONTEND_URL') || 'https://verdantcash.app';
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }
}
