import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction } from '../schemas/transaction.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
  ) {}

  async getFamilySummary(
    familyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const results = await this.transactionModel
      .aggregate([
        {
          $match: {
            familyId: familyId,
            date: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
          },
        },
      ])
      .exec();

    const summary = {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
    };

    results.forEach((res) => {
      if (res._id === 'income') summary.totalIncome = res.total;
      if (res._id === 'expense') summary.totalExpense = res.total;
    });

    summary.balance = summary.totalIncome - summary.totalExpense;
    return summary;
  }

  async getSpendingByCategory(
    familyId: string,
    startDate: Date,
    endDate: Date,
    type?: string,
  ): Promise<any> {
    const matchQuery: any = {
      familyId: familyId,
      date: { $gte: startDate, $lte: endDate },
      type: 'expense'
    };

    const results = await this.transactionModel
      .aggregate([
        {
          $match: matchQuery,
        },
        {
          $group: {
            _id: '$category',
            amount: { $sum: '$amount' },
          },
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            amount: 1,
          },
        },
        { $sort: { amount: -1 } },
      ])
      .exec();

    return results;
  }
}
