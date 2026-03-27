import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from '../schemas/transaction.schema';
import { Family } from '../schemas/family.schema';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    @InjectModel(Family.name) private familyModel: Model<Family>,
  ) {}

  async create(createTransactionDto: any, userId: string, familyId: string): Promise<Transaction> {
    throw new Error('Not implemented');
  }

  async findAll(familyId: string, filters?: any): Promise<Transaction[]> {
    throw new Error('Not implemented');
  }

  async findOne(id: string): Promise<Transaction> {
    throw new Error('Not implemented');
  }

  async update(id: string, updateTransactionDto: any): Promise<Transaction> {
    throw new Error('Not implemented');
  }

  async remove(id: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async getCategories(familyId: string): Promise<string[]> {
    throw new Error('Not implemented');
  }
}
