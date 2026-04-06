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
    familyId: string | null,
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const matchQuery: any = {
      date: { $gte: startDate, $lte: endDate },
    };
    if (familyId) {
      matchQuery.familyId = familyId;
    } else {
      matchQuery.userId = userId;
      matchQuery.familyId = null;
    }

    const results = await this.transactionModel
      .aggregate([
        {
          $match: matchQuery,
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
    familyId: string | null,
    userId: string,
    startDate: Date,
    endDate: Date,
    type?: string,
  ): Promise<any> {
    const matchQuery: any = {
      date: { $gte: startDate, $lte: endDate },
      type: 'expense'
    };
    
    if (familyId) {
      matchQuery.familyId = familyId;
    } else {
      matchQuery.userId = userId;
      matchQuery.familyId = null;
    }

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

  async getEvolutionReport(familyId: string | null, userId: string): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 2);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const matchQuery: any = {
      date: { $gte: startDate, $lte: endDate },
    };
    if (familyId) {
      matchQuery.familyId = familyId;
    } else {
      matchQuery.userId = userId;
      matchQuery.familyId = null;
    }

    const results = await this.transactionModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      }
    ]).exec();

    const months: any[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: `${d.getMonth() + 1}/${d.getFullYear()}`,
        income: 0,
        expense: 0,
        balance: 0
      });
    }

    results.forEach(res => {
      const target = months.find(m => m.year === res._id.year && m.month === res._id.month);
      if (target) {
        if (res._id.type === 'income') target.income += res.total;
        if (res._id.type === 'expense') target.expense += res.total;
      }
    });

    months.forEach(m => {
      m.balance = m.income - m.expense;
    });

    return months;
  }
}
