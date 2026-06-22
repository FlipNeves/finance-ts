import { CategorizationService } from './categorization.service';

describe('CategorizationService', () => {
  let service: CategorizationService;

  beforeEach(() => {
    service = new CategorizationService();
  });

  describe('word-boundary matching', () => {
    it('does not match "bar" inside "barbearia" (no false positive)', () => {
      const r = service.categorizeDetailed('Barbearia do Ze', 'expense');
      expect(r.category).toBe('Personal');
      expect(r.category).not.toBe('Entertainment');
    });

    it('prefers the more specific multi-word phrase', () => {
      const r = service.categorizeDetailed('UBER EATS DELIVERY', 'expense');
      expect(r.category).toBe('Food');
    });

    it('matches the rideshare token "99" as a standalone word', () => {
      expect(service.categorizeDetailed('Corrida 99', 'expense').category).toBe('Transportation');
    });
  });

  describe('salary vs. account yield', () => {
    it('classifies salary as Salary', () => {
      const r = service.categorizeDetailed('SALARIO EMPRESA ACME', 'income');
      expect(r.category).toBe('Salary');
      expect(r.isTransfer).toBe(false);
    });

    it('classifies account yield as InvestmentIncome, not Salary nor Transfer', () => {
      const r = service.categorizeDetailed('RENDIMENTO PAGO', 'income');
      expect(r.category).toBe('InvestmentIncome');
      expect(r.isTransfer).toBe(false);
    });
  });

  describe('PIX direction', () => {
    it('treats an incoming PIX with no merchant as generic Income', () => {
      const r = service.categorizeDetailed('PIX RECEBIDO JOAO SILVA', 'income');
      expect(r.category).toBe('Income');
    });

    it('treats an outgoing PIX with no merchant as Other (a real expense)', () => {
      const r = service.categorizeDetailed('PIX ENVIADO MARIA', 'expense');
      expect(r.category).toBe('Other');
      expect(r.isTransfer).toBe(false);
    });

    it('flags a PIX between the owner\'s own accounts as a Transfer', () => {
      const r = service.categorizeDetailed('PIX TRANSF MESMA TITULARIDADE', 'expense');
      expect(r.category).toBe('Transfer');
      expect(r.isTransfer).toBe(true);
    });

    it('flags a PIX to a known own-account name as a Transfer', () => {
      const r = service.categorizeDetailed('PIX ENVIADO NUBANK', 'expense', {
        ownAccounts: ['Nubank'],
      });
      expect(r.category).toBe('Transfer');
      expect(r.isTransfer).toBe(true);
    });
  });

  describe('internal transfers', () => {
    it('detects TED/DOC and investment moves as Transfer', () => {
      expect(service.categorizeDetailed('TED RECEBIDO', 'income').category).toBe('Transfer');
      expect(service.categorizeDetailed('APLICACAO AUTOMATICA', 'expense').category).toBe('Transfer');
      expect(service.categorizeDetailed('RESGATE CDB', 'income').isTransfer).toBe(true);
    });
  });

  describe('new categories', () => {
    it('recognizes Education, Shopping and Fees', () => {
      expect(service.categorizeDetailed('Mensalidade faculdade', 'expense').category).toBe('Education');
      expect(service.categorizeDetailed('Compra Amazon', 'expense').category).toBe('Shopping');
      expect(service.categorizeDetailed('IOF sobre compra', 'expense').category).toBe('Fees');
    });
  });

  describe('history index', () => {
    it('lets the owner\'s history override the keyword dictionary', () => {
      const key = service.merchantKey('Loja do Joao');
      const historyIndex = new Map([[key, 'Personal']]);
      const r = service.categorizeDetailed('Loja do Joao', 'expense', { historyIndex });
      expect(r.source).toBe('history');
      expect(r.category).toBe('Personal');
      expect(r.confidence).toBeGreaterThan(0.9);
    });
  });

  describe('confidence and source', () => {
    it('reports a low-confidence default when nothing matches', () => {
      const r = service.categorizeDetailed('xyzzy zork', 'expense');
      expect(r.category).toBe('Other');
      expect(r.source).toBe('default');
      expect(r.confidence).toBeLessThan(0.5);
    });
  });

  describe('back-compat API', () => {
    it('categorize() still returns a plain string', () => {
      expect(service.categorize('Padaria', 'expense')).toBe('Food');
    });

    it('defaults generic income to Income', () => {
      expect(service.categorize('Deposito avulso', 'income')).toBe('Income');
    });
  });
});
