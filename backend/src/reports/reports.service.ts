import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from '../schemas/transaction.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
  ) {}

  async getFamilySummary(familyId: string, startDate: Date, endDate: Date): Promise<any> {
    throw new Error('Not implemented');
  }

  async getSpendingByCategory(familyId: string, startDate: Date, endDate: Date): Promise<any> {
    throw new Error('Not implemented');
  }
}
