import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction } from '../schemas/transaction.schema';
import { Family } from '../schemas/family.schema';
import { User } from '../schemas/user.schema';
import { StatementParserService } from './statement-parser.service';
import { CategorizationService } from './categorization.service';

export interface ImportPreviewRow {
  tempId: string;
  date: string; // ISO
  description: string;
  originalDescription: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  bankAccount: string | null;
  fingerprint: string;
  isDuplicate: boolean;
  isTransfer: boolean;
  include: boolean;
}

export interface ImportPreviewResult {
  rows: ImportPreviewRow[];
  summary: {
    total: number;
    duplicates: number;
    transfers: number;
    totalIncome: number;
    totalExpense: number;
    net: number;
  };
}

@Injectable()
export class StatementImportService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    @InjectModel(Family.name) private familyModel: Model<Family>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly parser: StatementParserService,
    private readonly categorization: CategorizationService,
  ) {}

  private ownerQuery(userId: string, familyId: string | null) {
    return familyId
      ? { familyId: new Types.ObjectId(familyId) }
      : { userId: new Types.ObjectId(userId), familyId: null };
  }

  private async getCategories(userId: string, familyId: string | null): Promise<string[]> {
    if (familyId) {
      const family = await this.familyModel.findById(familyId).exec();
      return family?.customCategories || [];
    }
    const user = await this.userModel.findById(userId).exec();
    return user?.customCategories || [];
  }

  async preview(
    csv: string,
    userId: string,
    familyId: string | null,
    defaultBankAccount?: string,
  ): Promise<ImportPreviewResult> {
    if (!csv || !csv.trim()) {
      throw new BadRequestException('Empty statement content');
    }

    const parsed = this.parser.parse(csv);
    if (parsed.length === 0) {
      throw new BadRequestException('No transactions could be read from the statement');
    }

    const userCategories = await this.getCategories(userId, familyId);

    // Date window covered by the statement, to scope duplicate lookups.
    // UTC boundaries to match the UTC-midnight convention of stored dates.
    const dates = parsed.map((r) => r.date.getTime());
    const start = new Date(Math.min(...dates));
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(Math.max(...dates));
    end.setUTCHours(23, 59, 59, 999);

    const existing = await this.transactionModel
      .find({ ...this.ownerQuery(userId, familyId), date: { $gte: start, $lte: end } })
      .exec();

    // Existing fingerprints (recomputed when older transactions predate imports).
    const existingFingerprints = new Set<string>();
    for (const tx of existing) {
      const fp =
        tx.importFingerprint ||
        this.parser.fingerprint(new Date(tx.date), tx.amount, tx.description);
      existingFingerprints.add(fp);
    }

    const seenInBatch = new Set<string>();
    const account = defaultBankAccount?.trim() || null;

    const rows: ImportPreviewRow[] = parsed.map((r, idx) => {
      const isTransfer = this.categorization.isTransfer(r.description);
      const category = isTransfer
        ? 'Savings'
        : this.categorization.categorize(r.description, r.type, userCategories);

      const duplicateOfExisting = existingFingerprints.has(r.fingerprint);
      const duplicateInBatch = seenInBatch.has(r.fingerprint);
      seenInBatch.add(r.fingerprint);
      const isDuplicate = duplicateOfExisting || duplicateInBatch;

      return {
        tempId: `${idx}-${r.fingerprint}`,
        date: r.date.toISOString(),
        description: r.description,
        originalDescription: r.description,
        amount: r.amount,
        type: r.type,
        category,
        bankAccount: account,
        fingerprint: r.fingerprint,
        isDuplicate,
        isTransfer,
        // Everything is imported by default; isDuplicate/isTransfer are kept as
        // informational flags only (non-blocking). User can deselect manually.
        include: true,
      };
    });

    return { rows, summary: this.summarize(rows) };
  }

  private summarize(rows: ImportPreviewRow[]) {
    const included = rows.filter((r) => r.include);
    const totalIncome = included
      .filter((r) => r.type === 'income')
      .reduce((s, r) => s + r.amount, 0);
    const totalExpense = included
      .filter((r) => r.type === 'expense')
      .reduce((s, r) => s + r.amount, 0);
    return {
      total: rows.length,
      duplicates: rows.filter((r) => r.isDuplicate).length,
      transfers: rows.filter((r) => r.isTransfer).length,
      totalIncome: this.round2(totalIncome),
      totalExpense: this.round2(totalExpense),
      net: this.round2(totalIncome - totalExpense),
    };
  }

  async commit(
    rows: ImportPreviewRow[],
    userId: string,
    familyId: string | null,
  ): Promise<{ inserted: number; importBatchId: string; skippedDuplicates: number }> {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('No rows to import');
    }

    const importBatchId = new Types.ObjectId().toHexString();

    // Re-validate every row on the server — never trust the edited payload.
    const toInsert = rows.filter((r) => r.include).map((r) => this.validateRow(r));

    if (toInsert.length === 0) {
      throw new BadRequestException('No valid rows selected for import');
    }

    // Import everything the user selected — no duplicate skipping.
    const docs = toInsert.map((r) => ({
      description: r.description,
      amount: r.amount,
      type: r.type,
      category: r.category,
      bankAccount: r.bankAccount || undefined,
      date: new Date(r.date),
      isFixed: false,
      userId: new Types.ObjectId(userId),
      familyId: familyId ? new Types.ObjectId(familyId) : null,
      source: 'statement-import',
      importBatchId,
      originalDescription: r.originalDescription || r.description,
      importFingerprint: r.fingerprint,
    }));

    await this.transactionModel.insertMany(docs);

    return {
      inserted: docs.length,
      importBatchId,
      skippedDuplicates: 0,
    };
  }

  private validateRow(r: ImportPreviewRow): ImportPreviewRow {
    const amount = this.round2(Number(r.amount));
    if (!isFinite(amount) || amount <= 0) {
      throw new BadRequestException(`Invalid amount for "${r.description}"`);
    }
    const date = new Date(r.date);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date for "${r.description}"`);
    }
    if (r.type !== 'income' && r.type !== 'expense') {
      throw new BadRequestException(`Invalid type for "${r.description}"`);
    }
    const description = (r.description || '').trim() || 'Lançamento';
    return {
      ...r,
      amount,
      date: date.toISOString(),
      description,
      category: (r.category || '').trim() || 'Other',
      bankAccount: r.bankAccount ? String(r.bankAccount).trim() : null,
      fingerprint:
        r.fingerprint || this.parser.fingerprint(date, amount, description),
    };
  }

  async undoBatch(
    importBatchId: string,
    userId: string,
    familyId: string | null,
  ): Promise<{ deleted: number }> {
    if (!importBatchId) throw new BadRequestException('Missing importBatchId');
    const result = await this.transactionModel
      .deleteMany({ ...this.ownerQuery(userId, familyId), importBatchId })
      .exec();
    return { deleted: result.deletedCount || 0 };
  }

  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
}
