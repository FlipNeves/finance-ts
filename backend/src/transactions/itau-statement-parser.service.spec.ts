import { ItauStatementParserService } from './itau-statement-parser.service';
import { StatementParserService } from './statement-parser.service';
import { PdfTextItem } from './pdf-text-extractor.service';

/**
 * Fixtures mirror the real Itaú "extrato conta / lançamentos" layout
 * (x-positions taken from actual exports): date≈31, description≈96,
 * valor column≈413-461, saldo column≈516+.
 */
function item(str: string, x: number, y: number, page = 1): PdfTextItem {
  return { str, x, y, page };
}

const HEADER = (y: number, page = 1): PdfTextItem[] => [
  item('data', 31, y, page),
  item('lançamentos', 96, y, page),
  item('valor (R$)', 413, y, page),
  item('saldo (R$)', 516, y, page),
];

describe('ItauStatementParserService', () => {
  let parser: ItauStatementParserService;

  beforeEach(() => {
    parser = new ItauStatementParserService(new StatementParserService());
  });

  it('parses a debit (valor column, explicit minus sign) as an expense', () => {
    const items = [
      ...HEADER(597),
      item('22/05/2026', 31, 553),
      item('PIX TRANSF Lorena 22/05', 96, 553),
      item('-120,00', 423, 553),
    ];

    const rows = parser.parse(items);

    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('expense');
    expect(rows[0].amount).toBe(120);
    expect(rows[0].description).toBe('PIX TRANSF Lorena 22/05');
    expect(rows[0].date.toISOString()).toBe('2026-05-22T00:00:00.000Z');
  });

  it('parses an unsigned valor as income', () => {
    const items = [
      ...HEADER(597),
      item('07/05/2026', 31, 634),
      item('PAGTO SALARIO', 96, 634),
      item('6.553,98', 418, 634),
    ];

    const [row] = parser.parse(items);

    expect(row.type).toBe('income');
    expect(row.amount).toBe(6553.98);
  });

  it('skips SALDO DO DIA balance rows (value sits in the saldo column)', () => {
    const items = [
      ...HEADER(597),
      item('22/05/2026', 31, 572),
      item('SALDO DO DIA', 96, 572),
      item('43,21', 539, 572),
    ];

    expect(parser.parse(items)).toHaveLength(0);
  });

  it('keeps small interest credits (REND PAGO)', () => {
    const items = [
      ...HEADER(597),
      item('12/05/2026', 31, 67),
      item('REND PAGO APLIC AUT MAIS', 96, 67),
      item('0,02', 439, 67),
    ];

    const [row] = parser.parse(items);

    expect(row.type).toBe('income');
    expect(row.amount).toBe(0.02);
  });

  it('ignores header, account and period lines (no date / no valor)', () => {
    const items = [
      item('FILIPE NEVES B GONCALVES', 271, 770),
      item('agência: 8788', 449, 770),
      item('período de visualização: 02/04/2026 até 01/06/2026', 28, 630),
      item('emitido em: 01/06/2026', 431, 628),
      ...HEADER(597),
      item('saldo em conta', 31, 723),
      item('R$ 43,21', 31, 704),
    ];

    expect(parser.parse(items)).toHaveLength(0);
  });

  it('parses across multiple pages and reconstructs rows from scattered fragments', () => {
    const items = [
      // page 1
      ...HEADER(597, 1),
      item('-50,00', 427, 236, 1), // out-of-order fragment
      item('13/05/2026', 31, 236, 1),
      item('PIX TRANSF GUSTTAV13/05', 96, 236, 1),
      // page 2
      ...HEADER(800, 2),
      item('11/05/2026', 31, 765, 2),
      item('PIX TRANSF FILIPE 11/05', 96, 765, 2),
      item('-4.000,00', 410, 765, 2),
    ];

    const rows = parser.parse(items);

    expect(rows).toHaveLength(2);
    expect(rows[0].amount).toBe(50);
    expect(rows[0].type).toBe('expense');
    expect(rows[1].amount).toBe(4000);
    expect(rows[1].type).toBe('expense');
  });

  it('produces a stable fingerprint shared with the CSV parser', () => {
    const items = [
      ...HEADER(597),
      item('22/05/2026', 31, 553),
      item('PIX TRANSF Lorena 22/05', 96, 553),
      item('-120,00', 423, 553),
    ];

    const [row] = parser.parse(items);
    expect(row.fingerprint.startsWith('2026-05-22|120.00|')).toBe(true);
  });
});
