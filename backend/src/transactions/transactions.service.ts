import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction } from '../schemas/transaction.schema';
import { Family } from '../schemas/family.schema';

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
  ) {}

  async create(
    createTransactionDto: any,
    userId: string,
    familyId: string | null,
  ): Promise<Transaction> {
    const data = {
      ...createTransactionDto,
      userId,
      familyId,
      category: createTransactionDto.category || 'General',
    };
    const transaction = await this.transactionModel.create(data);
    return transaction;
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
    return transaction;
  }

  async remove(id: string): Promise<void> {
    const result = await this.transactionModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Transaction not found');
    }
  }

  async getCategories(familyId: string | null): Promise<string[]> {
    let customCategories: string[] = [];
    if (familyId) {
      const family = await this.familyModel.findById(familyId).exec();
      customCategories = family?.customCategories || [];
    }
    return [...new Set([...this.defaultCategories, ...customCategories])];
  }
}
