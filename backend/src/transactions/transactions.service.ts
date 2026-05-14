import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction } from '../schemas/transaction.schema';
import { Family } from '../schemas/family.schema';
import { Budget } from '../schemas/budget.schema';
import { User } from '../schemas/user.schema';
import { GoalContribution } from '../schemas/goal-contribution.schema';

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
  ) {}

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
          
          const matchQ: any = {
            category: transaction.category,
            type: 'expense',
            date: { $gte: start, $lte: end }
          };
          if (familyId) matchQ.familyId = familyId;
          else { matchQ.userId = userId; matchQ.familyId = null; }
          
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

  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.transactionModel.findById(id).exec();
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }

  async update(id: string, updateTransactionDto: any): Promise<Transaction> {
    const transaction = await this.transactionModel
      .findByIdAndUpdate(id, updateTransactionDto, { new: true })
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

  async remove(id: string): Promise<void> {
    const result = await this.transactionModel.findByIdAndDelete(id).exec();
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
