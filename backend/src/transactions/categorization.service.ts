import { Injectable } from '@nestjs/common';

export type CategorySource = 'history' | 'merchant' | 'structural' | 'default';

export interface CategorizationResult {
  category: string;
  confidence: number;
  source: CategorySource;
  isTransfer: boolean;
}

export interface CategorizeOptions {
  userCategories?: string[];
  historyIndex?: Map<string, string>;
  ownAccounts?: string[];
}

@Injectable()
export class CategorizationService {
  private readonly categoryKeywords: Record<string, string[]> = {
    Food: ['mercado', 'supermercado', 'almoco', 'jantar', 'cafe', 'lanche', 'restaurante', 'comida', 'padaria', 'acougue', 'feira', 'hortifruti', 'grocery', 'groceries', 'food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'snack', 'ifood', 'uber eats', 'rappi', 'zedelivery', 'ze delivery'],
    Housing: ['aluguel', 'condominio', 'rent', 'mortgage', 'iptu', 'imobiliaria'],
    Transportation: ['uber', 'onibus', 'metro', 'gasolina', 'combustivel', 'posto', 'estacionamento', 'fuel', 'bus', 'taxi', 'parking', '99', 'blablacar', 'pedagio', 'sem parar', 'veloe'],
    Utilities: ['luz', 'energia', 'agua', 'internet', 'telefone', 'celular', 'electricity', 'water', 'phone', 'gas bill', 'gas', 'vivo', 'claro', 'tim', 'enel', 'sabesp', 'copel', 'banda larga'],
    Medical: ['medico', 'farmacia', 'drogaria', 'hospital', 'dentista', 'saude', 'doctor', 'pharmacy', 'medicine', 'health', 'laboratorio', 'exame', 'consulta', 'unimed', 'plano de saude'],
    Entertainment: ['cinema', 'netflix', 'spotify', 'jogo', 'game', 'lazer', 'bar', 'festa', 'movie', 'entertainment', 'show', 'streaming', 'disney', 'hbo', 'prime video', 'youtube premium', 'steam', 'xbox', 'playstation', 'teatro'],
    Personal: ['roupa', 'calcado', 'perfume', 'cabelo', 'salao', 'barbearia', 'clothing', 'clothes', 'shoes', 'personal', 'academia', 'gym', 'cosmetico'],
    Shopping: ['loja', 'magazine', 'magalu', 'americanas', 'amazon', 'mercado livre', 'mercadolivre', 'shopee', 'aliexpress', 'shopping', 'marketplace', 'casas bahia', 'renner', 'riachuelo'],
    Education: ['escola', 'faculdade', 'curso', 'mensalidade', 'universidade', 'education', 'udemy', 'alura', 'colegio', 'creche', 'material escolar'],
    Savings: ['poupanca', 'investimento', 'savings', 'investment', 'aporte'],
    Insurance: ['seguro', 'insurance', 'seguradora', 'porto seguro'],
    Fees: ['tarifa', 'iof', 'anuidade', 'multa', 'imposto', 'darf', 'tributo', 'manutencao de conta'],
    Salary: ['salario', 'salary'],
    Other: [],
  };

  private readonly salaryKeywords: string[] = [
    'salario', 'salarios', 'ordenado', 'remuneracao', 'proventos', 'vencimento',
    'holerite', 'contracheque', 'payroll', 'wages', 'salary',
    'folha de pagamento', 'pagamento de salario', 'pgto salario', 'pagto salario',
  ];

  private readonly investmentIncomeKeywords: string[] = [
    'rendimento', 'rendimentos', 'rend pago', 'rendimento pago', 'rentabilidade',
    'dividendo', 'dividendos', 'jcp', 'juros recebidos', 'rendimento poupanca', 'rend cta',
  ];

  private readonly transferKeywords: string[] = [
    'transferencia', 'ted', 'doc', 'tef', 'aplicacao', 'aplic automatica',
    'aplicacao automatica', 'aplicacao financeira', 'resgate',
  ];

  private readonly selfTransferKeywords: string[] = [
    'mesma titularidade', 'titularidade', 'conta propria', 'entre contas',
  ];

  private readonly matcherCache = new Map<string, RegExp>();

  categorizeDetailed(
    description: string,
    type: 'income' | 'expense',
    opts: CategorizeOptions = {},
  ): CategorizationResult {
    const { userCategories = [], historyIndex, ownAccounts = [] } = opts;
    const norm = this.normalize(description);

    if (!norm) {
      return { category: type === 'income' ? 'Income' : 'Other', confidence: 0.2, source: 'default', isTransfer: false };
    }

    if (historyIndex && historyIndex.size > 0) {
      const key = this.merchantKey(description);
      const hit = key ? historyIndex.get(key) : undefined;
      if (hit) {
        return { category: hit, confidence: 0.95, source: 'history', isTransfer: hit === 'Transfer' };
      }
    }

    for (const cat of userCategories) {
      const c = this.normalize(cat);
      if (c && this.matchWord(norm, c)) {
        return { category: cat, confidence: 0.8, source: 'merchant', isTransfer: false };
      }
    }

    const kw = this.bestKeyword(norm);
    const hasPix = this.matchWord(norm, 'pix');

    if (this.matchAny(norm, this.salaryKeywords)) {
      return { category: 'Salary', confidence: 0.9, source: 'structural', isTransfer: false };
    }

    if (this.matchAny(norm, this.investmentIncomeKeywords)) {
      return { category: 'InvestmentIncome', confidence: 0.9, source: 'structural', isTransfer: false };
    }

    const isSelf =
      this.matchAny(norm, this.selfTransferKeywords) ||
      ownAccounts.some((a) => {
        const an = this.normalize(a);
        return an.length > 2 && this.matchWord(norm, an);
      });
    if (this.matchAny(norm, this.transferKeywords) || (hasPix && isSelf)) {
      return { category: 'Transfer', confidence: 0.85, source: 'structural', isTransfer: true };
    }

    if (hasPix) {
      if (type === 'income') {
        if (kw && kw.words >= 2) return this.fromKeyword(kw);
        return { category: 'Income', confidence: 0.55, source: 'structural', isTransfer: false };
      }
      if (kw) return this.fromKeyword(kw);
      return { category: 'Other', confidence: 0.4, source: 'structural', isTransfer: false };
    }

    if (kw) return this.fromKeyword(kw);

    return { category: type === 'income' ? 'Income' : 'Other', confidence: 0.25, source: 'default', isTransfer: false };
  }

  categorize(
    description: string,
    type: 'income' | 'expense',
    userCategories: string[] = [],
  ): string {
    return this.categorizeDetailed(description, type, { userCategories }).category;
  }

  isTransfer(description: string): boolean {
    const norm = this.normalize(description);
    if (!norm) return false;
    return (
      this.matchAny(norm, this.transferKeywords) ||
      (this.matchWord(norm, 'pix') && this.matchAny(norm, this.selfTransferKeywords))
    );
  }

  merchantKey(description: string): string {
    const noise = new Set([
      'compra', 'cartao', 'debito', 'credito', 'deb', 'cred', 'pagto', 'pagamento',
      'pag', 'parcela', 'parc', 'ref', 'pix', 'ted', 'doc', 'transferencia',
      'enviado', 'recebido', 'em', 'de', 'da', 'do', 'para', 'com',
    ]);
    const tokens = this.normalize(description)
      .split(' ')
      .filter((tk) => tk && !noise.has(tk) && !/^\d+$/.test(tk));
    const key = tokens.join(' ');
    return key || this.normalize(description);
  }

  private normalize(text: string): string {
    return (text || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private matcher(keyword: string): RegExp {
    let re = this.matcherCache.get(keyword);
    if (!re) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      re = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`);
      this.matcherCache.set(keyword, re);
    }
    return re;
  }

  private matchWord(normalized: string, keyword: string): boolean {
    if (!keyword) return false;
    return this.matcher(keyword).test(normalized);
  }

  private matchAny(normalized: string, keywords: string[]): boolean {
    return keywords.some((kw) => this.matchWord(normalized, kw));
  }

  private bestKeyword(
    normalized: string,
  ): { category: string; words: number; score: number } | null {
    let best: { category: string; words: number; score: number } | null = null;
    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      for (const kw of keywords) {
        if (this.matchWord(normalized, kw)) {
          const words = kw.split(' ').length;
          const score = words * 100 + kw.length;
          if (!best || score > best.score) best = { category, words, score };
        }
      }
    }
    return best;
  }

  private fromKeyword(kw: { category: string; words: number }): CategorizationResult {
    return {
      category: kw.category,
      confidence: kw.words >= 2 ? 0.8 : 0.6,
      source: 'merchant',
      isTransfer: false,
    };
  }
}
