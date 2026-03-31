import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    familyId: string,
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

  async findAll(familyId: string, filters?: any): Promise<Transaction[]> {
    const query = { familyId, ...filters };
    return this.transactionModel.find(query).sort({ date: -1 }).exec();
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

  async getCategories(familyId: string): Promise<string[]> {
    const family = await this.familyModel.findById(familyId).exec();
    const customCategories = family?.customCategories || [];
    return [...new Set([...this.defaultCategories, ...customCategories])];
  }
}
