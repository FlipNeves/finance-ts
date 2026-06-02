import { Injectable } from '@nestjs/common';

/**
 * Keyword-based categorization shared by the chat parser and the statement
 * importer. Deterministic (no LLM): fast and predictable for bulk imports.
 */
@Injectable()
export class CategorizationService {
  private readonly categoryKeywords: Record<string, string[]> = {
    Food: ['mercado', 'supermercado', 'almoço', 'jantar', 'café', 'lanche', 'restaurante', 'comida', 'padaria', 'açougue', 'feira', 'grocery', 'groceries', 'food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'snack', 'ifood', 'uber eats'],
    Housing: ['aluguel', 'condomínio', 'condominio', 'rent', 'mortgage', 'iptu'],
    Transportation: ['uber', 'ônibus', 'onibus', 'metrô', 'metro', 'gasolina', 'combustível', 'combustivel', 'estacionamento', 'gas', 'fuel', 'bus', 'taxi', 'parking', '99'],
    Utilities: ['luz', 'água', 'agua', 'internet', 'telefone', 'celular', 'gás', 'electricity', 'water', 'phone', 'gas bill'],
    Medical: ['médico', 'medico', 'farmácia', 'farmacia', 'hospital', 'dentista', 'saúde', 'saude', 'doctor', 'pharmacy', 'medicine', 'health'],
    Entertainment: ['cinema', 'netflix', 'spotify', 'jogo', 'game', 'lazer', 'bar', 'festa', 'movie', 'entertainment', 'show', 'streaming'],
    Personal: ['roupa', 'calçado', 'calcado', 'perfume', 'cabelo', 'clothing', 'clothes', 'shoes', 'personal'],
    Savings: ['poupança', 'poupanca', 'investimento', 'savings', 'investment'],
    Insurance: ['seguro', 'insurance'],
    Salary: ['salário', 'salario', 'salary', 'wages', 'pagamento', 'payment'],
    Other: [],
  };

  // Markers that indicate a movement between the user's own accounts (or
  // savings/investment redemptions) rather than real income/expense. These
  // should NOT inflate the month's inflow/outflow.
  private readonly transferKeywords: string[] = [
    'transferência', 'transferencia', 'transfer', 'aplicação', 'aplicacao',
    'resgate', 'rendimento', 'ted', 'doc ', 'pix enviado para mim',
    'aplic. automatica', 'aplicacao automatica', 'invest', 'cdb', 'tesouro',
  ];

  /**
   * Picks the best category for a description. User-defined categories take
   * precedence (by name match), then the keyword dictionary, then a sensible
   * default per type.
   */
  categorize(
    description: string,
    type: 'income' | 'expense',
    userCategories: string[] = [],
  ): string {
    const lower = description.toLowerCase();

    for (const cat of userCategories) {
      if (cat && lower.includes(cat.toLowerCase())) {
        return cat;
      }
    }

    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          return category;
        }
      }
    }

    return type === 'income' ? 'Salary' : 'Other';
  }

  /** True when the description looks like an internal transfer / investment move. */
  isTransfer(description: string): boolean {
    const lower = description.toLowerCase();
    return this.transferKeywords.some((kw) => lower.includes(kw));
  }
}
