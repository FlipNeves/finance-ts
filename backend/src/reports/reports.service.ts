import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
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

  async getEvolutionReport(familyId: string | null, userId: string, referenceDate: Date, monthsCount = 3): Promise<any> {
    const span = Math.max(1, monthsCount);

    const endDate = new Date(referenceDate);
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(referenceDate);
    startDate.setDate(1);
    startDate.setMonth(startDate.getMonth() - (span - 1));
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
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(referenceDate);
      d.setDate(1);
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

  async getTopSpendingInfo(
    familyId: string | null,
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const matchQuery: any = {
      date: { $gte: startDate, $lte: endDate },
      type: 'expense',
    };

    if (familyId) {
      matchQuery.familyId = familyId;
    } else {
      matchQuery.userId = userId;
      matchQuery.familyId = null;
    }

    const results = await this.transactionModel.aggregate([
      { $match: matchQuery },
      { $sort: { amount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          description: 1,
          amount: 1,
          date: 1,
          userName: '$user.name',
        }
      }
    ]).exec();

    return { type: familyId ? 'family_transactions' : 'user_transactions', data: results };
  }

  async getDailySpending(
    familyId: string | null,
    userId: string,
    startDate: Date,
    endDate: Date,
    type?: string
  ): Promise<any> {
    const matchQuery: any = {
      date: { $gte: startDate, $lte: endDate },
    };
    
    if (type && type !== 'all') {
      matchQuery.type = type;
    } else {
      matchQuery.type = 'expense';
    }

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
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          amount: { $sum: '$amount' },
          variableAmount: {
            $sum: {
              $cond: [{ $eq: ['$isFixed', true] }, 0, '$amount'],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]).exec();

    return results.map(r => ({
      date: r._id,
      amount: r.amount,
      variableAmount: r.variableAmount,
    }));
  }

  async getBalanceByAccount(
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
          _id: { bankAccount: '$bankAccount', type: '$type' },
          total: { $sum: '$amount' },
        },
      },
    ]).exec();

    const accountsMap = new Map<string, { bankAccount: string, income: number, expense: number, balance: number }>();

    results.forEach(res => {
      const accName = res._id.bankAccount || 'Outros';
      if (!accountsMap.has(accName)) {
        accountsMap.set(accName, { bankAccount: accName, income: 0, expense: 0, balance: 0 });
      }
      const acc = accountsMap.get(accName)!;
      if (res._id.type === 'income') acc.income += res.total;
      if (res._id.type === 'expense') acc.expense += res.total;
    });

    const finalAccounts = Array.from(accountsMap.values()).map(acc => {
      acc.balance = acc.income - acc.expense;
      return acc;
    });

    return finalAccounts.sort((a, b) => b.balance - a.balance);
  }

  async getSpendingByMember(
    familyId: string | null,
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    if (!familyId) {
      return [];
    }

    const matchQuery: any = {
      familyId: familyId,
      date: { $gte: startDate, $lte: endDate },
    };

    const results = await this.transactionModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { userId: '$userId', type: '$type' },
          total: { $sum: '$amount' },
        },
      },
      {
        $addFields: {
          _userIdObj: {
            $convert: {
              input: '$_id.userId',
              to: 'objectId',
              onError: null,
              onNull: null,
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          let: { uid: '$_userIdObj' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
            { $project: { _id: 1, name: 1 } },
          ],
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]).exec();

    const membersMap = new Map<string, { userId: string, userName: string, income: number, expense: number, balance: number }>();
    results.forEach(res => {
      const uid = res._id.userId ? res._id.userId.toString() : 'unknown';
      if (!membersMap.has(uid)) {
        membersMap.set(uid, {
          userId: uid,
          userName: res.user ? res.user.name : 'Unknown',
          income: 0,
          expense: 0,
          balance: 0,
        });
      }
      const member = membersMap.get(uid)!;
      if (res._id.type === 'income') member.income += res.total;
      if (res._id.type === 'expense') member.expense += res.total;
    });

    const finalMembers = Array.from(membersMap.values()).map(m => {
      m.balance = m.income - m.expense;
      return m;
    });

    return finalMembers.sort((a, b) => b.expense - a.expense);
  }

  async getUpcomingFixed(
    familyId: string | null,
    userId: string,
    referenceDate: Date,
  ): Promise<any> {
    const refYear = referenceDate.getUTCFullYear();
    const refMonth = referenceDate.getUTCMonth();
    const refDay = referenceDate.getUTCDate();

    const prevStart = new Date(Date.UTC(refYear, refMonth - 1, 1));
    const prevEnd = new Date(Date.UTC(refYear, refMonth, 1));
    const currStart = new Date(Date.UTC(refYear, refMonth, 1));
    const currEnd = new Date(Date.UTC(refYear, refMonth + 1, 1));
    const lastDayCurrentMonth = new Date(Date.UTC(refYear, refMonth + 1, 0)).getUTCDate();

    const baseQuery: any = { isFixed: true, type: 'expense' };
    if (familyId) {
      baseQuery.familyId = familyId;
    } else {
      baseQuery.userId = userId;
      baseQuery.familyId = null;
    }

    const [prevFixed, currFixed] = await Promise.all([
      this.transactionModel.find({ ...baseQuery, date: { $gte: prevStart, $lt: prevEnd } }).exec(),
      this.transactionModel.find({ ...baseQuery, date: { $gte: currStart, $lt: currEnd } }).exec(),
    ]);

    const normalize = (s: string) => (s || '').trim().toLowerCase();

    // Per-transaction matching: each prev tries to find an unused curr counterpart.
    // Two transactions are considered "same recurrence" if either
    //   (a) descriptions normalize equal, or
    //   (b) same category AND amount within ±20%.
    // This tolerates description drift ("Aluguel" vs "Aluguel Maio") that previously
    // caused legitimate already-paid bills to leak into upcoming.
    const usedCurr = new Set<string>();
    const upcoming: { day: number; amount: number; description: string; category: string }[] = [];

    for (const prev of prevFixed as any[]) {
      const normPrev = normalize(prev.description);
      const tol = prev.amount * 0.2;
      const match = (currFixed as any[]).find((c: any) => {
        if (usedCurr.has(c._id.toString())) return false;
        if (normalize(c.description) === normPrev) return true;
        if (c.category === prev.category && Math.abs(c.amount - prev.amount) <= tol) return true;
        return false;
      });
      if (match) {
        usedCurr.add(match._id.toString());
        continue;
      }
      const day = Math.min((prev.date as Date).getUTCDate(), lastDayCurrentMonth);
      if (day <= refDay) continue;
      upcoming.push({
        day,
        amount: prev.amount,
        description: prev.description,
        category: prev.category,
      });
    }

    return upcoming.sort((a, b) => a.day - b.day);
  }

  async getIncomeSummary(
    familyId: string | null,
    userId: string,
    startDate: Date,
    endDate: Date,
    referenceDate: Date,
  ): Promise<any> {
    const refYear = referenceDate.getUTCFullYear();
    const refMonth = referenceDate.getUTCMonth();
    const refDay = referenceDate.getUTCDate();

    const prevStart = new Date(Date.UTC(refYear, refMonth - 1, 1));
    const prevEnd = new Date(Date.UTC(refYear, refMonth, 1));
    const lastDayCurrentMonth = new Date(Date.UTC(refYear, refMonth + 1, 0)).getUTCDate();

    const baseQuery: any = { type: 'income' };
    if (familyId) {
      baseQuery.familyId = familyId;
    } else {
      baseQuery.userId = userId;
      baseQuery.familyId = null;
    }

    const [prevIncome, currIncome] = await Promise.all([
      this.transactionModel.find({ ...baseQuery, date: { $gte: prevStart, $lt: prevEnd } }).exec(),
      this.transactionModel.find({ ...baseQuery, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }).exec(),
    ]);

    const normalize = (s: string) => (s || '').trim().toLowerCase();
    const usedCurr = new Set<string>();
    const upcoming: { day: number; amount: number; description: string; category: string }[] = [];
    const missed: { day: number; amount: number; description: string; category: string }[] = [];

    for (const prev of prevIncome as any[]) {
      const normPrev = normalize(prev.description);
      const tol = prev.amount * 0.2;
      const match = (currIncome as any[]).find((c: any) => {
        if (usedCurr.has(c._id.toString())) return false;
        if (normalize(c.description) === normPrev) return true;
        if (c.category === prev.category && Math.abs(c.amount - prev.amount) <= tol) return true;
        return false;
      });
      if (match) {
        usedCurr.add(match._id.toString());
        continue;
      }
      const day = Math.min((prev.date as Date).getUTCDate(), lastDayCurrentMonth);
      const item = {
        day,
        amount: prev.amount,
        description: prev.description,
        category: prev.category,
      };
      if (day > refDay) {
        upcoming.push(item);
      } else {
        missed.push(item);
      }
    }

    const events = (currIncome as any[]).map((t: any) => ({
      date: (t.date as Date).toISOString().split('T')[0],
      day: (t.date as Date).getUTCDate(),
      amount: t.amount,
      description: t.description,
      category: t.category,
    }));

    return {
      events,
      upcoming: upcoming.sort((a, b) => a.day - b.day),
      missed: missed.sort((a, b) => a.day - b.day),
    };
  }

  async getTotalAccumulated(familyId: string | null, userId: string): Promise<any> {
    const matchQuery: any = {};
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
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]).exec();
    
    let totalIncome = 0;
    let totalExpense = 0;
    results.forEach(res => {
      if (res._id === 'income') totalIncome += res.total;
      if (res._id === 'expense') totalExpense += res.total;
    });
    
    return {
      totalAccumulated: totalIncome - totalExpense,
      totalIncome,
      totalExpense,
    };
  }
}
