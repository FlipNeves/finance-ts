import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction } from '../schemas/transaction.schema';
import { Family } from '../schemas/family.schema';
import { Budget } from '../schemas/budget.schema';
import { User } from '../schemas/user.schema';
import { GoalContribution } from '../schemas/goal-contribution.schema';
import { CategorizationService } from './categorization.service';

@Injectable()
export class TransactionsService {
  private readonly defaultCategories = [
    'Food',
    'Housing',
    'Transportation',
    'Utilities',
    'Insurance',
    'Medical',
    'Savings',
    'Entertainment',
    'Personal',
    'Salary',
    'Other',
  ];

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    @InjectModel(Family.name) private familyModel: Model<Family>,
    @InjectModel(Budget.name) private budgetModel: Model<Budget>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(GoalContribution.name)
    private contributionModel: Model<GoalContribution>,
    private readonly categorizationService: CategorizationService,
  ) {}

  /**
   * One-line entry: parses "15 padaria" / "padaria 15,50" / "+2000 salário"
   * into a transaction, inferring the category from the description.
   */
  async quickCreate(
    text: string,
    dateStr: string | undefined,
    userId: string,
    familyId: string | null,
  ): Promise<any> {
    let input = (text || '').trim();
    let type: 'income' | 'expense' = 'expense';
    if (input.startsWith('+')) {
      type = 'income';
      input = input.slice(1).trim();
    }

    // First numeric token wins: supports "1.234,56", "15,50", "15.50", "15".
    const amountMatch = input.match(
      /\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?/,
    );
    if (!amountMatch) {
      throw new BadRequestException(
        'Could not find an amount in the text. Try e.g. "15 padaria".',
      );
    }
    const raw = amountMatch[0];
    const normalized = raw.includes(',')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw;
    const amount = Math.round(parseFloat(normalized) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero.');
    }

    const description = input
      .replace(amountMatch[0], ' ')
      .replace(/\bR\$\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!description) {
      throw new BadRequestException(
        'Describe the transaction along with the amount, e.g. "15 padaria".',
      );
    }

    const categories = await this.getCategories(familyId, userId);
    const category = this.categorizationService.categorize(
      description,
      type,
      categories,
    );

    // Pin to UTC midnight of today's calendar date, matching how the manual
    // entry modal and the statement importer store date-only values.
    const now = new Date();
    const date = dateStr
      ? new Date(dateStr)
      : new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const { transaction, alert } = await this.create(
      {
        description,
        amount,
        type,
        category,
        date,
        isFixed: false,
      },
      userId,
      familyId,
    );

    return { transaction, alert, parsed: { description, amount, type, category } };
  }

  async create(
    createTransactionDto: any,
    userId: string,
    familyId: string | null,
  ): Promise<any> {
    const data = {
      ...createTransactionDto,
      userId,
      familyId,
      category: createTransactionDto.category || 'General',
    };
    const transaction = await this.transactionModel.create(data);

    // Budget Checking Logic
    let alertMsg = undefined;
    if (transaction.type === 'expense') {
      const now = new Date(transaction.date);
      const m = now.getMonth() + 1;
      const y = now.getFullYear();

      const query: any = { month: m, year: y };
      if (familyId) query.familyId = familyId;
      else { query.userId = userId; query.familyId = null; }

      const budget = await this.budgetModel.findOne(query).exec();
      if (budget && budget.categoryLimits && budget.categoryLimits.length > 0) {
        const catLimit = budget.categoryLimits.find(c => c.category === transaction.category);
        if (catLimit && catLimit.limit > 0) {
          // Calculate total spent in this category this month
          const start = new Date(y, m - 1, 1);
          const end = new Date(y, m, 0, 23, 59, 59);
          
          // Aggregations bypass mongoose casting — owner ids must be ObjectIds.
          const matchQ: any = {
            category: transaction.category,
            type: 'expense',
            date: { $gte: start, $lte: end },
          };
          if (familyId) matchQ.familyId = new Types.ObjectId(familyId);
          else {
            matchQ.userId = new Types.ObjectId(String(userId));
            matchQ.familyId = null;
          }
          
          const totalCatResult = await this.transactionModel.aggregate([
            { $match: matchQ },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]).exec();

          const totalCat = totalCatResult.length > 0 ? totalCatResult[0].total : 0;
          if ((totalCat / catLimit.limit) >= 0.8) {
            alertMsg = `Aviso: Você já atingiu ${(totalCat / catLimit.limit * 100).toFixed(0)}% do limite para '${transaction.category}' este mês (Limite: R$${catLimit.limit}).`;
          }
        }
      }
    }

    return { transaction, alert: alertMsg };
  }

  async findAll(familyId: string | null, userId: string, filters?: any): Promise<Transaction[]> {
    const query: any = {};
    if (familyId) {
      query.familyId = familyId;
    } else {
      query.userId = userId;
      query.familyId = null;
    }
    
    if (filters?.type && filters.type !== 'all') {
      query.type = filters.type;
    }

    if (filters?.startDate || filters?.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.date.$lte = new Date(filters.endDate);
      }
    }
    
    return this.transactionModel
      .find(query)
      .populate('userId', 'name')
      .sort({ date: -1 })
      .exec();
  }

  private buildScope(familyId: string | null, userId: string): any {
    if (familyId) return { familyId };
    return { userId, familyId: null };
  }

  async findOne(
    id: string,
    familyId: string | null,
    userId: string,
  ): Promise<Transaction> {
    const transaction = await this.transactionModel
      .findOne({ _id: id, ...this.buildScope(familyId, userId) })
      .exec();
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }

  async update(
    id: string,
    updateTransactionDto: any,
    familyId: string | null,
    userId: string,
  ): Promise<Transaction> {
    const { userId: _u, familyId: _f, ...safeUpdate } = updateTransactionDto;
    const transaction = await this.transactionModel
      .findOneAndUpdate(
        { _id: id, ...this.buildScope(familyId, userId) },
        safeUpdate,
        { new: true },
      )
      .exec();
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    const txObjectId = new Types.ObjectId(id);
    await this.contributionModel
      .updateMany(
        { transactionId: { $in: [id, txObjectId] } },
        { $set: { amount: transaction.amount, date: transaction.date } },
      )
      .exec();
    return transaction;
  }

  async remove(
    id: string,
    familyId: string | null,
    userId: string,
  ): Promise<void> {
    const result = await this.transactionModel
      .findOneAndDelete({ _id: id, ...this.buildScope(familyId, userId) })
      .exec();
    if (!result) {
      throw new NotFoundException('Transaction not found');
    }
    const txObjectId = new Types.ObjectId(id);
    await this.contributionModel.deleteMany({ transactionId: { $in: [id, txObjectId] } }).exec();
  }

  async getCategories(familyId: string | null, userId: string): Promise<string[]> {
    let customCategories: string[] = [];
    if (familyId) {
      const family = await this.familyModel.findById(familyId).exec();
      customCategories = family?.customCategories || [];
    } else {
      const user = await this.userModel.findById(userId).exec();
      customCategories = user?.customCategories || [];
    }
    return [...new Set([...this.defaultCategories, ...customCategories])];
  }

  async getBankAccounts(familyId: string | null, userId: string): Promise<string[]> {
    if (familyId) {
      const family = await this.familyModel.findById(familyId).exec();
      return family?.bankAccounts || [];
    }
    const user = await this.userModel.findById(userId).exec();
    return user?.bankAccounts || [];
  }
}
