import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Budget } from '../schemas/budget.schema';

@Injectable()
export class BudgetsService {
  constructor(@InjectModel(Budget.name) private budgetModel: Model<Budget>) {}

  async getBudget(userId: string, familyId: string | null, month: number, year: number) {
    const query: any = { month, year };
    if (familyId) {
      query.familyId = familyId;
    } else {
      query.userId = userId;
      query.familyId = null;
    }

    const budget = await this.budgetModel.findOne(query).exec();
    if (!budget) {
      // Return a blank default if not found
      return { totalLimit: 0, categoryLimits: [] };
    }
    return budget;
  }

  async saveBudget(userId: string, familyId: string | null, month: number, year: number, data: any) {
    const query: any = { month, year };
    if (familyId) {
      query.familyId = familyId;
    } else {
      query.userId = userId;
      query.familyId = null;
    }

    const updateData = {
      ...data,
      userId,
      familyId,
      month,
      year,
    };

    const budget = await this.budgetModel.findOneAndUpdate(query, updateData, { new: true, upsert: true }).exec();
    return budget;
  }

  async copyPreviousMonth(userId: string, familyId: string | null, currentMonth: number, currentYear: number) {
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear--;
    }

    const prevBudget = await this.getBudget(userId, familyId, prevMonth, prevYear);
    if (!prevBudget || (!prevBudget.totalLimit && (!prevBudget.categoryLimits || prevBudget.categoryLimits.length === 0))) {
      throw new NotFoundException('No previous budget found to copy.');
    }

    return await this.saveBudget(userId, familyId, currentMonth, currentYear, {
      totalLimit: prevBudget.totalLimit,
      categoryLimits: prevBudget.categoryLimits,
    });
  }
}
