import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction } from '../schemas/transaction.schema';
import { Budget } from '../schemas/budget.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    @InjectModel(Budget.name) private budgetModel: Model<Budget>,
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

    const results = await this.transactionModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { type: '$type', isFixed: '$isFixed' },
          total: { $sum: '$amount' },
        },
      },
    ]).exec();

    // Biggest expense
    const biggestExpenseArr = await this.transactionModel.find({ ...matchQuery, type: 'expense' }).sort({ amount: -1 }).limit(1).exec();
    const biggestExpense = biggestExpenseArr.length > 0 ? biggestExpenseArr[0] : null;

    const summary = {
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      fixedExpense: 0,
      variableExpense: 0,
      biggestExpense,
      previousMonthIncome: 0,
      previousMonthExpense: 0,
      budgetLimit: 0,
    };

    results.forEach((res) => {
      if (res._id.type === 'income') summary.totalIncome += res.total;
      if (res._id.type === 'expense') {
        summary.totalExpense += res.total;
        if (res._id.isFixed) summary.fixedExpense += res.total;
        else summary.variableExpense += res.total;
      }
    });

    summary.balance = summary.totalIncome - summary.totalExpense;

    // Previous month logic
    const prevStartDate = new Date(startDate);
    prevStartDate.setMonth(prevStartDate.getMonth() - 1);
    const prevEndDate = new Date(endDate);
    prevEndDate.setMonth(prevEndDate.getMonth() - 1);
    
    const prevMatchQuery = { ...matchQuery, date: { $gte: prevStartDate, $lte: prevEndDate } };
    const prevResults = await this.transactionModel.aggregate([
      { $match: prevMatchQuery },
      { $group: { _id: '$type', total: { $sum: '$amount' } } }
    ]).exec();

    prevResults.forEach((res) => {
      if (res._id === 'income') summary.previousMonthIncome = res.total;
      if (res._id === 'expense') summary.previousMonthExpense = res.total;
    });

    // Budget global limit
    const m = startDate.getMonth() + 1;
    const y = startDate.getFullYear();
    const budgetQuery: any = { month: m, year: y };
    if (familyId) budgetQuery.familyId = familyId;
    else { budgetQuery.userId = userId; budgetQuery.familyId = null; }

    const budget = await this.budgetModel.findOne(budgetQuery).exec();
    if (budget) {
      summary.budgetLimit = budget.totalLimit || 0;
    }

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

  async getEvolutionReport(familyId: string | null, userId: string, referenceDate: Date): Promise<any> {
    const endDate = new Date(referenceDate);
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date(referenceDate);
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
      const d = new Date(referenceDate);
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
