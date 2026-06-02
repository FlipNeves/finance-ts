import { Injectable } from '@nestjs/common';
import { CategorizationService } from '../transactions/categorization.service';

export interface ParsedTransaction {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category?: string;
  date?: string; 
  bankAccount?: string;
  confidence: number; 
}

interface RegexPattern {
  regex: RegExp;
  type: 'income' | 'expense';
  amountGroup: number;
  descGroup: number;
  confidence: number;
  defaultDescription?: string;
}

@Injectable()
export class MessageParserService {
  constructor(private readonly categorizationService: CategorizationService) {}

  private readonly patterns: RegexPattern[] = [
    // PT-BR: Expense (verb + preposition) — highest confidence
    { regex: /(?:gastei|paguei|comprei|torrei|desembolsei|transferi|enviei|mandei)\s+(?:R\$\s*)?(\d+(?:[.,]\d+)*)\s+(?:em|de|no|na|com|pro|pra|para)\s+(.+)/i, type: 'expense', amountGroup: 1, descGroup: 2, confidence: 0.95 },
    { regex: /(?:gastei|paguei|comprei|torrei|desembolsei|transferi|enviei|mandei)\s+(?:R\$\s*)?(\d+(?:[.,]\d+)*)\s+(.+)/i, type: 'expense', amountGroup: 1, descGroup: 2, confidence: 0.85 },

    // PT-BR: Income (verb + preposition)
    { regex: /(?:recebi|ganhei|entrou|vendi|faturei|lucrei|embolsei|caiu|depositaram)\s+(?:R\$\s*)?(\d+(?:[.,]\d+)*)\s+(?:de|do|da|com|pelo|pela|via)\s+(.+)/i, type: 'income', amountGroup: 1, descGroup: 2, confidence: 0.95 },
    { regex: /(?:recebi|ganhei|entrou|vendi|faturei|lucrei|embolsei|caiu|depositaram)\s+(?:R\$\s*)?(\d+(?:[.,]\d+)*)\s+(.+)/i, type: 'income', amountGroup: 1, descGroup: 2, confidence: 0.85 },

    // EN: Expense (verb + preposition)
    { regex: /(?:spent|paid|bought|sent|transferred)\s+\$?(\d+(?:[.,]\d+)*)\s+(?:on|for|at|to)\s+(.+)/i, type: 'expense', amountGroup: 1, descGroup: 2, confidence: 0.95 },
    { regex: /(?:spent|paid|bought|sent|transferred)\s+\$?(\d+(?:[.,]\d+)*)\s+(.+)/i, type: 'expense', amountGroup: 1, descGroup: 2, confidence: 0.85 },

    // EN: Income (verb + preposition)
    { regex: /(?:received|earned|got|sold|deposited)\s+\$?(\d+(?:[.,]\d+)*)\s+(?:from|for|via)\s+(.+)/i, type: 'income', amountGroup: 1, descGroup: 2, confidence: 0.95 },
    { regex: /(?:received|earned|got|sold|deposited)\s+\$?(\d+(?:[.,]\d+)*)\s+(.+)/i, type: 'income', amountGroup: 1, descGroup: 2, confidence: 0.85 },

    // Verb-only (no description) — uses default description per type/language
    { regex: /^(?:gastei|paguei|comprei|torrei|desembolsei|transferi|enviei|mandei)\s+(?:R\$\s*)?(\d+(?:[.,]\d+)*)\s*$/i, type: 'expense', amountGroup: 1, descGroup: 0, confidence: 0.80, defaultDescription: 'Gasto' },
    { regex: /^(?:recebi|ganhei|entrou|vendi|faturei|lucrei|embolsei|caiu|depositaram)\s+(?:R\$\s*)?(\d+(?:[.,]\d+)*)\s*$/i, type: 'income', amountGroup: 1, descGroup: 0, confidence: 0.80, defaultDescription: 'Recebimento' },
    { regex: /^(?:spent|paid|bought|sent|transferred)\s+\$?(\d+(?:[.,]\d+)*)\s*$/i, type: 'expense', amountGroup: 1, descGroup: 0, confidence: 0.80, defaultDescription: 'Expense' },
    { regex: /^(?:received|earned|got|sold|deposited)\s+\$?(\d+(?:[.,]\d+)*)\s*$/i, type: 'income', amountGroup: 1, descGroup: 0, confidence: 0.80, defaultDescription: 'Income' },

    // Signed shortcuts: "+500 freela" → income, "-50 mercado" → expense
    { regex: /^\+\s*(?:R\$\s*|\$)?(\d+(?:[.,]\d+)*)\s+(?:de|do|da|com|from)?\s*(.+)/i, type: 'income', amountGroup: 1, descGroup: 2, confidence: 0.75 },
    { regex: /^-\s*(?:R\$\s*|\$)?(\d+(?:[.,]\d+)*)\s+(?:em|de|no|na|com|pro|pra|para|on|for|at)?\s*(.+)/i, type: 'expense', amountGroup: 1, descGroup: 2, confidence: 0.75 },

    // Catch-all (Implicit) — REQUIRES explicit currency marker to avoid false positives
    { regex: /^(.+?)\s+(?:R\$\s*|\$)(\d+(?:[.,]\d+)*)$/i, type: 'expense', amountGroup: 2, descGroup: 1, confidence: 0.65 },
    { regex: /^(.+?)\s+(\d+(?:[.,]\d+)*)\s+(?:reais|real|dollars?|bucks?)$/i, type: 'expense', amountGroup: 2, descGroup: 1, confidence: 0.65 },
  ];

  private readonly datePatterns: { regex: RegExp; resolver: () => Date }[] = [
    { regex: /\bhoje\b|\btoday\b/i, resolver: () => new Date() },
    {
      regex: /\bontem\b|\byesterday\b/i,
      resolver: () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d;
      },
    },
    {
      regex: /\banteontem\b|\bday before yesterday\b/i,
      resolver: () => {
        const d = new Date();
        d.setDate(d.getDate() - 2);
        return d;
      },
    },
    {
      regex: /\bdia\s+(\d{1,2})\b/i,
      resolver: () => {
        return new Date();
      },
    },
  ];

  parse(message: string, userCategories: string[], userBankAccounts: string[] = []): ParsedTransaction | null {
    const trimmed = message.trim();
    if (!trimmed) return null;

    for (const pattern of this.patterns) {
      const match = trimmed.match(pattern.regex);
      if (match) {
        const amount = this.normalizeAmount(match[pattern.amountGroup]);

        if (isNaN(amount) || amount <= 0) continue;

        const date = this.extractDate(trimmed);

        const bankExtract = this.extractBankAccount(trimmed, userBankAccounts);
        if (bankExtract.needsLlm) {
          return null;
        }

        let description = pattern.descGroup > 0 ? (match[pattern.descGroup] || '').trim() : '';
        description = this.removeDateTokens(description).trim();
        description = this.removeBankAccountTokens(description, bankExtract.account).trim();

        if (!description && pattern.defaultDescription) {
          description = pattern.defaultDescription;
        }

        if (!description) continue;

        const category = this.categorizationService.categorize(description, pattern.type, userCategories);

        return {
          type: pattern.type,
          amount,
          description: this.capitalize(description),
          category,
          date: date.toISOString(),
          bankAccount: bankExtract.account || undefined,
          confidence: pattern.confidence,
        };
      }
    }

    return null;
  }

  private normalizeAmount(raw: string): number {
    const cleaned = raw.replace(/[R$\s]/g, '');
    const hasDot = cleaned.includes('.');
    const hasComma = cleaned.includes(',');

    let normalized: string;

    if (hasDot && hasComma) {
      // Last separator is the decimal mark; the other is thousands
      normalized = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
        ? cleaned.replace(/\./g, '').replace(',', '.')  // BR: 1.500,00
        : cleaned.replace(/,/g, '');                     // US: 1,500.00
    } else if (hasComma) {
      const parts = cleaned.split(',');
      // 3-digit tail or multiple separators → thousands; otherwise decimal
      normalized = parts.length > 2 || parts[parts.length - 1].length === 3
        ? cleaned.replace(/,/g, '')
        : cleaned.replace(',', '.');
    } else if (hasDot) {
      const parts = cleaned.split('.');
      normalized = parts.length > 2 || parts[parts.length - 1].length === 3
        ? cleaned.replace(/\./g, '')
        : cleaned;
    } else {
      normalized = cleaned;
    }

    return parseFloat(normalized);
  }

  private extractDate(message: string): Date {
    const diaMatch = message.match(/\bdia\s+(\d{1,2})\b/i);
    if (diaMatch) {
      const day = parseInt(diaMatch[1], 10);
      const now = new Date();
      if (day >= 1 && day <= 31) {
        const result = new Date(now.getFullYear(), now.getMonth(), day);
        if (result > now) {
          result.setMonth(result.getMonth() - 1);
        }
        return result;
      }
    }

    for (const dp of this.datePatterns) {
      if (dp.regex.test(message)) {
        return dp.resolver();
      }
    }

    return new Date();
  }

  private removeDateTokens(text: string): string {
    return text
      .replace(/\b(?:hoje|today|ontem|yesterday|anteontem|day before yesterday)\b/gi, '')
      .replace(/\bdia\s+\d{1,2}\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private extractBankAccount(message: string, bankAccounts: string[]): { account: string | null, needsLlm: boolean } {
    const lower = message.toLowerCase();

    for (const account of bankAccounts) {
      if (lower.includes(account.toLowerCase())) {
        return { account, needsLlm: false };
      }
    }

    const explicitAccountMarkers = ['conta', 'cartão', 'cartao', 'banco', 'bank', 'account', 'pix', 'crédito', 'credito', 'débito', 'debito'];
    for (const marker of explicitAccountMarkers) {
      if (lower.includes(marker)) {
        return { account: null, needsLlm: true };
      }
    }

    const ptPattern = /(?:na|no|da|do|pela|pelo|via)\s+([\w\s]+)$/i;
    const enPattern = /(?:from|via|in|at)\s+(?:my\s+)?([\w\s]+)$/i;

    if (ptPattern.test(message) || enPattern.test(message)) {
      return { account: null, needsLlm: true };
    }

    return { account: null, needsLlm: false };
  }

  private removeBankAccountTokens(text: string, knownAccountStr: string | null): string {
    if (!knownAccountStr) return text;
    const escaped = knownAccountStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\s*(?:na|no|da|do|pela|pelo|via|from|in|at)?\\s*(?:conta|account)?\\s*${escaped}\\b`, 'gi');
    return text.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
