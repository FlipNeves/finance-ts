import { Injectable } from '@nestjs/common';

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
}

@Injectable()
export class MessageParserService {
  private readonly patterns: RegexPattern[] = [
    // PT-BR: Expense patterns
    { regex: /(?:gastei|paguei|comprei)\s+(?:R\$\s*)?(\d+[.,]?\d*)\s+(?:em|de|no|na|com|pro|pra|para)\s+(.+)/i, type: 'expense', amountGroup: 1, descGroup: 2 },
    { regex: /(?:gastei|paguei|comprei)\s+(?:R\$\s*)?(\d+[.,]?\d*)\s+(.+)/i, type: 'expense', amountGroup: 1, descGroup: 2 },
    { regex: /(.+?)\s+(?:R\$\s*)?(\d+[.,]?\d*)\s*(?:reais)?$/i, type: 'expense', amountGroup: 2, descGroup: 1 },

    // PT-BR: Income patterns
    { regex: /(?:recebi|ganhei|entrou)\s+(?:R\$\s*)?(\d+[.,]?\d*)\s+(?:de|do|da|com)\s+(.+)/i, type: 'income', amountGroup: 1, descGroup: 2 },
    { regex: /(?:recebi|ganhei|entrou)\s+(?:R\$\s*)?(\d+[.,]?\d*)\s+(.+)/i, type: 'income', amountGroup: 1, descGroup: 2 },

    // EN: Expense patterns
    { regex: /(?:spent|paid|bought)\s+\$?(\d+[.,]?\d*)\s+(?:on|for|at)\s+(.+)/i, type: 'expense', amountGroup: 1, descGroup: 2 },
    { regex: /(?:spent|paid|bought)\s+\$?(\d+[.,]?\d*)\s+(.+)/i, type: 'expense', amountGroup: 1, descGroup: 2 },

    // EN: Income patterns
    { regex: /(?:received|earned|got)\s+\$?(\d+[.,]?\d*)\s+(?:from|for)\s+(.+)/i, type: 'income', amountGroup: 1, descGroup: 2 },
    { regex: /(?:received|earned|got)\s+\$?(\d+[.,]?\d*)\s+(.+)/i, type: 'income', amountGroup: 1, descGroup: 2 },
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
        const rawAmount = match[pattern.amountGroup].replace(',', '.');
        const amount = parseFloat(rawAmount);

        if (isNaN(amount) || amount <= 0) continue;

        let description = match[pattern.descGroup].trim();

        const date = this.extractDate(trimmed);

        const bankAccount = this.extractBankAccount(trimmed, userBankAccounts);

        description = this.removeDateTokens(description).trim();
        description = this.removeBankAccountTokens(description).trim();

        if (!description) continue;

        const category = this.matchCategory(description, pattern.type, userCategories);

        return {
          type: pattern.type,
          amount,
          description: this.capitalize(description),
          category,
          date: date.toISOString(),
          bankAccount: bankAccount || undefined,
          confidence: 0.85,
        };
      }
    }

    return null;
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

  private matchCategory(description: string, type: 'income' | 'expense', userCategories: string[]): string {
    const lower = description.toLowerCase();

    const categoryKeywords: Record<string, string[]> = {
      'Food': ['mercado', 'supermercado', 'almoço', 'jantar', 'café', 'lanche', 'restaurante', 'comida', 'padaria', 'açougue', 'feira', 'grocery', 'groceries', 'food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'snack', 'ifood', 'uber eats'],
      'Housing': ['aluguel', 'condomínio', 'condominio', 'rent', 'mortgage', 'iptu'],
      'Transportation': ['uber', 'ônibus', 'onibus', 'metrô', 'metro', 'gasolina', 'combustível', 'combustivel', 'estacionamento', 'gas', 'fuel', 'bus', 'taxi', 'parking', '99'],
      'Utilities': ['luz', 'água', 'agua', 'internet', 'telefone', 'celular', 'gás', 'electricity', 'water', 'phone', 'gas bill'],
      'Medical': ['médico', 'medico', 'farmácia', 'farmacia', 'hospital', 'dentista', 'saúde', 'saude', 'doctor', 'pharmacy', 'medicine', 'health'],
      'Entertainment': ['cinema', 'netflix', 'spotify', 'jogo', 'game', 'lazer', 'bar', 'festa', 'movie', 'entertainment', 'show', 'streaming'],
      'Personal': ['roupa', 'calçado', 'calcado', 'perfume', 'cabelo', 'clothing', 'clothes', 'shoes', 'personal'],
      'Savings': ['poupança', 'poupanca', 'investimento', 'savings', 'investment'],
      'Insurance': ['seguro', 'insurance'],
      'Salary': ['salário', 'salario', 'salary', 'wages', 'pagamento', 'payment'],
      'Other': [],
    };

    for (const cat of userCategories) {
      if (lower.includes(cat.toLowerCase())) {
        return cat;
      }
    }

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          return category;
        }
      }
    }

    return type === 'income' ? 'Salary' : 'Other';
  }

  private extractBankAccount(message: string, bankAccounts: string[]): string | null {
    const lower = message.toLowerCase();

    for (const account of bankAccounts) {
      if (lower.includes(account.toLowerCase())) {
        return account;
      }
    }

    const ptPattern = /(?:na|no|da|do|pela|pelo)\s+(?:conta\s+(?:do|da|de)?\s*)?([\w]+)$/i;
    const enPattern = /(?:from|via|in|at)\s+(?:my\s+)?([\w]+)\s+account$/i;

    const ptMatch = message.match(ptPattern);
    if (ptMatch) {
      const candidate = ptMatch[1].trim();
      const commonBanks = ['nubank', 'itau', 'itaú', 'bradesco', 'bb', 'inter', 'c6', 'santander', 'caixa', 'picpay', 'mercadopago', 'sicoob', 'sicredi', 'next', 'neon', 'pagbank'];
      if (commonBanks.some(b => candidate.toLowerCase().includes(b))) {
        return this.capitalize(candidate);
      }
    }

    const enMatch = message.match(enPattern);
    if (enMatch) {
      return this.capitalize(enMatch[1].trim());
    }

    return null;
  }

  private removeBankAccountTokens(text: string): string {
    return text
      .replace(/\s+(?:na|no|da|do|pela|pelo)\s+(?:conta\s+(?:do|da|de)?\s*)?[\w]+$/gi, '')
      .replace(/\s+(?:from|via|in|at)\s+(?:my\s+)?[\w]+\s+account$/gi, '')
      .trim();
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
