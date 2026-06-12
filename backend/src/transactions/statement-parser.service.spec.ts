import { StatementParserService } from './statement-parser.service';

describe('StatementParserService', () => {
  let parser: StatementParserService;

  beforeEach(() => {
    parser = new StatementParserService();
  });

  describe('parseDate', () => {
    // Regression: dates used to be created at *local* midnight, which shifted
    // imported transactions out of UTC-based date filters (imported rows on
    // the range's end day were invisible to the user).
    it('pins DD/MM/YYYY to UTC midnight', () => {
      const d = parser.parseDate('12/06/2026')!;
      expect(d.toISOString()).toBe('2026-06-12T00:00:00.000Z');
    });

    it('pins ISO dates to UTC midnight', () => {
      const d = parser.parseDate('2026-06-12')!;
      expect(d.toISOString()).toBe('2026-06-12T00:00:00.000Z');
    });

    it('pins DD/MM (current year) to UTC midnight', () => {
      const d = parser.parseDate('05/03')!;
      expect(d.getUTCDate()).toBe(5);
      expect(d.getUTCMonth()).toBe(2);
      expect(d.getUTCHours()).toBe(0);
    });

    it('returns null for unparseable input', () => {
      expect(parser.parseDate('not a date')).toBeNull();
      expect(parser.parseDate('')).toBeNull();
    });
  });

  describe('parse', () => {
    it('parses a BR bank CSV and keeps rows on their UTC calendar day', () => {
      const csv = [
        'Data;Descrição;Valor',
        '01/06/2026;Supermercado;-150,00',
        '30/06/2026;Salário;3000,00',
      ].join('\n');

      const rows = parser.parse(csv);

      expect(rows).toHaveLength(2);
      expect(rows[0].date.toISOString()).toBe('2026-06-01T00:00:00.000Z');
      expect(rows[0].type).toBe('expense');
      expect(rows[0].amount).toBe(150);
      expect(rows[1].date.toISOString()).toBe('2026-06-30T00:00:00.000Z');
      expect(rows[1].type).toBe('income');
      expect(rows[1].amount).toBe(3000);
    });

    it('fingerprints rows with the UTC calendar day', () => {
      const csv = ['Data;Descrição;Valor', '30/06/2026;Mercado;-50,00'].join('\n');
      const [row] = parser.parse(csv);
      expect(row.fingerprint.startsWith('2026-06-30|')).toBe(true);
    });
  });
});
