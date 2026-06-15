import { Injectable } from '@nestjs/common';
import {
  ParsedStatementRow,
  StatementParserService,
} from './statement-parser.service';
import { PdfTextItem } from './pdf-text-extractor.service';

interface StatementLine {
  y: number;
  page: number;
  items: PdfTextItem[]; // sorted left-to-right
}

/**
 * Parser for Itaú "extrato conta / lançamentos" PDFs, whose table reads
 * `data | lançamentos | valor (R$) | saldo (R$)`. A value in the *valor* column
 * is a movement (sign already explicit, e.g. `-120,00`); a value only in the
 * *saldo* column is a running daily balance (`SALDO DO DIA`) and is dropped.
 * The columns are split by x-position at the midpoint of their header labels.
 *
 * Amount/date/fingerprint parsing is delegated to {@link StatementParserService}
 * so PDF and CSV imports share one BR-format implementation.
 */
@Injectable()
export class ItauStatementParserService {
  private readonly dateRe = /^\d{2}\/\d{2}\/\d{4}$/;
  private readonly moneyRe = /^-?\d{1,3}(\.\d{3})*,\d{2}$/;
  private readonly fallbackThreshold = 480;

  // Non-movement rows that share the table layout but must never be imported.
  private readonly skipMarkers = [
    'saldo do dia',
    'saldo anterior',
    'saldo final',
    'saldo inicial',
    'saldo em conta',
    's a l d o',
  ];

  constructor(private readonly base: StatementParserService) {}

  parse(items: PdfTextItem[]): ParsedStatementRow[] {
    const lines = this.groupLines(items);
    const threshold = this.findColumnBoundary(lines);

    const rows: ParsedStatementRow[] = [];
    for (const line of lines) {
      const row = this.parseLine(line, threshold);
      if (row) rows.push(row);
    }
    return rows;
  }

  /** Clusters fragments sharing a baseline (within tolerance) into one row. */
  private groupLines(items: PdfTextItem[]): StatementLine[] {
    const tolerance = 3;
    const sorted = [...items].sort(
      (a, b) => a.page - b.page || b.y - a.y || a.x - b.x,
    );

    const lines: StatementLine[] = [];
    for (const it of sorted) {
      const last = lines[lines.length - 1];
      if (last && last.page === it.page && Math.abs(last.y - it.y) <= tolerance) {
        last.items.push(it);
      } else {
        lines.push({ y: it.y, page: it.page, items: [it] });
      }
    }
    for (const line of lines) line.items.sort((a, b) => a.x - b.x);
    return lines;
  }

  /**
   * x-boundary between the "valor" and "saldo" columns, taken as the midpoint
   * of their header labels. Falls back to a constant when no header is found.
   */
  private findColumnBoundary(lines: StatementLine[]): number {
    for (const line of lines) {
      const valor = line.items.find((i) => this.norm(i.str).includes('valor'));
      const saldo = line.items.find((i) => this.norm(i.str).includes('saldo'));
      if (valor && saldo && saldo.x > valor.x) {
        return (valor.x + saldo.x) / 2;
      }
    }
    return this.fallbackThreshold;
  }

  private parseLine(
    line: StatementLine,
    threshold: number,
  ): ParsedStatementRow | null {
    const dateItem = line.items.find((i) => this.dateRe.test(i.str.trim()));
    if (!dateItem) return null; // header/account/footer lines carry no date
    const date = this.base.parseDate(dateItem.str.trim());
    if (!date) return null;

    const moneyItems = line.items.filter((i) =>
      this.moneyRe.test(i.str.trim().replace(/\s/g, '')),
    );
    // No value in the valor column → balance-only row (SALDO DO DIA).
    const valorItems = moneyItems.filter((i) => i.x < threshold);
    if (valorItems.length === 0) return null;

    const description = this.buildDescription(line, dateItem, moneyItems, threshold);
    if (this.isSkippable(description)) return null;

    const valorItem = valorItems[valorItems.length - 1];
    const signed = this.base.parseAmount(valorItem.str);
    if (signed === null || isNaN(signed) || signed === 0) return null;

    const amount = this.round2(Math.abs(signed));
    if (amount <= 0) return null;
    const type: 'income' | 'expense' = signed > 0 ? 'income' : 'expense';

    const rawLine = line.items
      .map((i) => i.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      date,
      description,
      amount,
      type,
      fingerprint: this.base.fingerprint(date, amount, description),
      rawLine,
    };
  }

  /** Description = fragments between the date and the valor column. */
  private buildDescription(
    line: StatementLine,
    dateItem: PdfTextItem,
    moneyItems: PdfTextItem[],
    threshold: number,
  ): string {
    const text = line.items
      .filter(
        (i) =>
          i !== dateItem &&
          !moneyItems.includes(i) &&
          i.x > dateItem.x &&
          i.x < threshold,
      )
      .map((i) => i.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text || 'Lançamento';
  }

  private isSkippable(text: string): boolean {
    const v = this.norm(text);
    return this.skipMarkers.some((m) => v.includes(m));
  }

  private norm(s: string): string {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
  }

  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
}
