import { Injectable } from '@nestjs/common';

export interface ParsedStatementRow {
  date: Date;
  description: string;
  amount: number; // always positive, rounded to 2 decimals
  type: 'income' | 'expense';
  fingerprint: string;
  rawLine: string;
}

interface ColumnMapping {
  date: number;
  description: number;
  amount: number; // signed single-column amount
  debit: number; // separate debit column (expense)
  credit: number; // separate credit column (income)
}

/**
 * Bank-agnostic CSV statement parser. Detects delimiter, header columns and
 * value/date formats heuristically so it copes with most Brazilian bank
 * exports without per-bank configuration.
 */
@Injectable()
export class StatementParserService {
  private readonly dateHeaders = ['data', 'date', 'dt', 'data lançamento', 'data lancamento', 'data mov'];
  private readonly descHeaders = ['descrição', 'descricao', 'histórico', 'historico', 'lançamento', 'lancamento', 'description', 'memo', 'detalhe', 'detalhes'];
  private readonly amountHeaders = ['valor', 'amount', 'value', 'montante'];
  private readonly debitHeaders = ['débito', 'debito', 'saída', 'saida', 'debit', 'pagamento', 'paid out'];
  private readonly creditHeaders = ['crédito', 'credito', 'entrada', 'credit', 'recebido', 'paid in'];

  // Lines that are balances/totals rather than real movements.
  private readonly skipMarkers = ['saldo', 'balance', 'total do dia', 'saldo anterior', 'saldo final', 's a l d o'];

  parse(rawCsv: string): ParsedStatementRow[] {
    const text = rawCsv.replace(/^﻿/, ''); // strip BOM
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const delimiter = this.detectDelimiter(lines);
    const headerIndex = this.findHeaderIndex(lines, delimiter);
    const mapping = this.buildMapping(
      headerIndex >= 0 ? this.splitLine(lines[headerIndex], delimiter) : [],
    );

    const rows: ParsedStatementRow[] = [];
    const startIndex = headerIndex >= 0 ? headerIndex + 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const rawLine = lines[i];
      const cols = this.splitLine(rawLine, delimiter);
      const row = this.parseRow(cols, mapping, rawLine);
      if (row) rows.push(row);
    }

    return rows;
  }

  private detectDelimiter(lines: string[]): string {
    const candidates = [';', ',', '\t', '|'];
    const sample = lines.slice(0, Math.min(5, lines.length));
    let best = ';';
    let bestCount = -1;
    for (const d of candidates) {
      const counts = sample.map((l) => l.split(d).length - 1);
      const min = Math.min(...counts);
      const total = counts.reduce((a, b) => a + b, 0);
      // Prefer a delimiter that appears consistently on every sampled line.
      const score = min > 0 ? total + 100 : total;
      if (score > bestCount) {
        bestCount = score;
        best = d;
      }
    }
    return best;
  }

  private splitLine(line: string, delimiter: string): string[] {
    // Minimal CSV field handling: respects double-quoted fields containing the
    // delimiter. Good enough for bank exports (no embedded newlines).
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result.map((c) => c.replace(/^"|"$/g, '').trim());
  }

  private findHeaderIndex(lines: string[], delimiter: string): number {
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const cols = this.splitLine(lines[i], delimiter).map((c) => c.toLowerCase());
      const hasDate = cols.some((c) => this.matchesAny(c, this.dateHeaders));
      const hasMoney =
        cols.some((c) => this.matchesAny(c, this.amountHeaders)) ||
        cols.some((c) => this.matchesAny(c, this.debitHeaders)) ||
        cols.some((c) => this.matchesAny(c, this.creditHeaders));
      if (hasDate && hasMoney) return i;
    }
    return -1;
  }

  private buildMapping(headerCols: string[]): ColumnMapping {
    const lower = headerCols.map((c) => c.toLowerCase());
    const mapping: ColumnMapping = {
      date: this.findColumn(lower, this.dateHeaders),
      description: this.findColumn(lower, this.descHeaders),
      amount: this.findColumn(lower, this.amountHeaders),
      debit: this.findColumn(lower, this.debitHeaders),
      credit: this.findColumn(lower, this.creditHeaders),
    };

    // Fallback to positional guess when there was no usable header row.
    if (headerCols.length === 0) {
      mapping.date = 0;
      mapping.description = 1;
      mapping.amount = 2;
    }
    return mapping;
  }

  private findColumn(lowerCols: string[], headers: string[]): number {
    for (let i = 0; i < lowerCols.length; i++) {
      if (this.matchesAny(lowerCols[i], headers)) return i;
    }
    return -1;
  }

  private matchesAny(value: string, headers: string[]): boolean {
    const v = this.norm(value);
    return headers.some((h) => v.includes(this.norm(h)));
  }

  /** Lowercases and strips diacritics so "Descrição" === "descricao". */
  private norm(s: string): string {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
  }

  private parseRow(
    cols: string[],
    mapping: ColumnMapping,
    rawLine: string,
  ): ParsedStatementRow | null {
    if (cols.length === 0) return null;

    const dateRaw = mapping.date >= 0 ? cols[mapping.date] : '';
    const date = this.parseDate(dateRaw);
    if (!date) return null;

    const descRaw = mapping.description >= 0 ? cols[mapping.description] : '';
    const description = (descRaw || 'Lançamento').trim();

    if (this.isSkippable(description) || this.isSkippable(rawLine)) return null;

    let signedAmount: number | null = null;

    if (mapping.debit >= 0 || mapping.credit >= 0) {
      const debit = mapping.debit >= 0 ? this.parseAmount(cols[mapping.debit]) : 0;
      const credit = mapping.credit >= 0 ? this.parseAmount(cols[mapping.credit]) : 0;
      if (credit && credit > 0) signedAmount = Math.abs(credit);
      else if (debit && debit > 0) signedAmount = -Math.abs(debit);
    } else if (mapping.amount >= 0) {
      signedAmount = this.parseAmount(cols[mapping.amount]);
    }

    if (signedAmount === null || isNaN(signedAmount) || signedAmount === 0) {
      return null;
    }

    const type: 'income' | 'expense' = signedAmount > 0 ? 'income' : 'expense';
    const amount = this.round2(Math.abs(signedAmount));
    if (amount <= 0) return null;

    return {
      date,
      description,
      amount,
      type,
      fingerprint: this.fingerprint(date, amount, description),
      rawLine,
    };
  }

  private isSkippable(text: string): boolean {
    const lower = text.toLowerCase();
    return this.skipMarkers.some((m) => lower.includes(m));
  }

  /** Parses BR (1.234,56) and US (1,234.56) formats; keeps the sign. */
  parseAmount(raw: string): number {
    if (raw === undefined || raw === null) return NaN;
    let cleaned = String(raw).trim();
    if (!cleaned) return NaN;

    // Detect negativity: leading '-', trailing '-' (some banks), or parentheses.
    const negative =
      /^-/.test(cleaned) || /-$/.test(cleaned) || /^\(.*\)$/.test(cleaned) || /\bD\b\s*$/i.test(cleaned);
    const positiveMarker = /\bC\b\s*$/i.test(cleaned); // explicit credit marker

    cleaned = cleaned.replace(/[()CD]/gi, '').replace(/[R$\s]/g, '').replace(/[+\-]/g, '');

    const hasDot = cleaned.includes('.');
    const hasComma = cleaned.includes(',');
    let normalized: string;

    if (hasDot && hasComma) {
      normalized =
        cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
          ? cleaned.replace(/\./g, '').replace(',', '.') // BR: 1.500,00
          : cleaned.replace(/,/g, ''); // US: 1,500.00
    } else if (hasComma) {
      const parts = cleaned.split(',');
      normalized =
        parts.length > 2 || parts[parts.length - 1].length === 3
          ? cleaned.replace(/,/g, '')
          : cleaned.replace(',', '.');
    } else if (hasDot) {
      const parts = cleaned.split('.');
      normalized =
        parts.length > 2 || parts[parts.length - 1].length === 3
          ? cleaned.replace(/\./g, '')
          : cleaned;
    } else {
      normalized = cleaned;
    }

    const value = parseFloat(normalized);
    if (isNaN(value)) return NaN;
    if (positiveMarker) return Math.abs(value);
    return negative ? -Math.abs(value) : value;
  }

  /**
   * Parses DD/MM/YYYY, DD/MM/YY, YYYY-MM-DD and DD/MM (current year).
   * Dates are pinned to UTC midnight — the same convention the manual entry
   * modal uses — so date-range filters behave identically for imported and
   * hand-entered transactions regardless of server timezone.
   */
  parseDate(raw: string): Date | null {
    if (!raw) return null;
    const s = raw.trim();

    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); // ISO
    if (m) {
      const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
      return isNaN(d.getTime()) ? null : d;
    }

    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/); // DD/MM/YYYY
    if (m) {
      let year = Number(m[3]);
      if (year < 100) year += 2000;
      const d = new Date(Date.UTC(year, Number(m[2]) - 1, Number(m[1])));
      return isNaN(d.getTime()) ? null : d;
    }

    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})$/); // DD/MM
    if (m) {
      const d = new Date(
        Date.UTC(new Date().getFullYear(), Number(m[2]) - 1, Number(m[1])),
      );
      return isNaN(d.getTime()) ? null : d;
    }

    return null;
  }

  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  /** Normalized identity of a statement line, used for dedup/idempotency. */
  fingerprint(date: Date, amount: number, description: string): string {
    const day = date.toISOString().slice(0, 10);
    const normDesc = description
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    return `${day}|${amount.toFixed(2)}|${normDesc}`;
  }
}
