import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Goal } from '../schemas/goal.schema';
import { GoalContribution } from '../schemas/goal-contribution.schema';
import { Transaction } from '../schemas/transaction.schema';

type GoalStatus = 'on-track' | 'off-track' | 'achieved' | 'blocked';

type GoalProjection = {
  currentAmount: number;
  remaining: number;
  monthlyReserve: number;
  etaMonths: number | null;
  monthsToTarget: number | null;
  status: GoalStatus;
};

const RESERVE_WINDOW_MONTHS = 3;

@Injectable()
export class GoalsService {
  constructor(
    @InjectModel(Goal.name) private goalModel: Model<Goal>,
    @InjectModel(GoalContribution.name)
    private contributionModel: Model<GoalContribution>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<Transaction>,
  ) {}

  async create(
    createGoalDto: any,
    userId: string,
    familyId: string | null,
  ): Promise<Goal> {
    const data = {
      title: createGoalDto.title,
      targetAmount: createGoalDto.targetAmount,
      targetDate: createGoalDto.targetDate || null,
      category: createGoalDto.category || null,
      userId,
      familyId,
    };
    return this.goalModel.create(data);
  }

  async findAll(familyId: string | null, userId: string): Promise<any[]> {
    const query: any = {};
    if (familyId) {
      query.familyId = familyId;
    } else {
      query.userId = userId;
      query.familyId = null;
    }

    const goals = await this.goalModel.find(query).sort({ createdAt: -1 }).exec();
    if (goals.length === 0) return [];

    const monthlyReserve = await this.calculateMonthlyReserve(
      familyId,
      userId,
    );
    const goalIds = goals.map((g) => g._id);
    const totalsByGoal = await this.contributionTotals(goalIds);

    return goals.map((goal) => {
      const currentAmount = totalsByGoal.get(goal._id.toString()) || 0;
      return {
        ...goal.toJSON(),
        projection: this.projectGoal(
          goal.targetAmount,
          goal.targetDate,
          currentAmount,
          monthlyReserve,
        ),
      };
    });
  }

  async findOne(
    id: string,
    familyId: string | null,
    userId: string,
  ): Promise<any> {
    const goal = await this.goalModel
      .findOne({ _id: id, ...this.buildScope(familyId, userId) })
      .exec();
    if (!goal) throw new NotFoundException('Goal not found');

    const monthlyReserve = await this.calculateMonthlyReserve(
      familyId,
      userId,
    );
    const totals = await this.contributionTotals([goal._id]);
    const currentAmount = totals.get(goal._id.toString()) || 0;

    return {
      ...goal.toJSON(),
      projection: this.projectGoal(
        goal.targetAmount,
        goal.targetDate,
        currentAmount,
        monthlyReserve,
      ),
    };
  }

  async update(
    id: string,
    updateGoalDto: any,
    familyId: string | null,
    userId: string,
  ): Promise<Goal> {
    const goal = await this.goalModel
      .findOneAndUpdate(
        { _id: id, ...this.buildScope(familyId, userId) },
        updateGoalDto,
        { new: true },
      )
      .exec();
    if (!goal) throw new NotFoundException('Goal not found');
    return goal;
  }

  async remove(
    id: string,
    familyId: string | null,
    userId: string,
  ): Promise<void> {
    const goal = await this.goalModel
      .findOneAndDelete({ _id: id, ...this.buildScope(familyId, userId) })
      .exec();
    if (!goal) throw new NotFoundException('Goal not found');

    const goalIdFilter = { goalId: { $in: [id, new Types.ObjectId(id)] } };
    const contributions = await this.contributionModel
      .find(goalIdFilter)
      .select('transactionId')
      .exec();
    const transactionIds = contributions
      .map((c) => c.transactionId)
      .filter((t): t is Types.ObjectId => Boolean(t));
    if (transactionIds.length > 0) {
      await this.transactionModel
        .deleteMany({ _id: { $in: transactionIds } })
        .exec();
    }
    await this.contributionModel.deleteMany(goalIdFilter).exec();
  }

  async listContributions(
    goalId: string,
    familyId: string | null,
    userId: string,
  ): Promise<GoalContribution[]> {
    await this.assertGoalAccess(goalId, familyId, userId);
    const objectId = new Types.ObjectId(goalId);
    return this.contributionModel
      .find({ goalId: { $in: [goalId, objectId] } })
      .sort({ date: -1 })
      .exec();
  }

  async addContribution(
    goalId: string,
    dto: any,
    userId: string,
    familyId: string | null,
  ): Promise<GoalContribution> {
    const goal = await this.assertGoalAccess(goalId, familyId, userId);
    const date = dto.date ? new Date(dto.date) : new Date();
    const amount = dto.amount;

    const transaction = await this.transactionModel.create({
      description: `Aporte: ${goal.title}`,
      amount,
      type: 'expense',
      category: 'Aporte',
      date,
      userId,
      familyId,
      isFixed: false,
    });

    try {
      return await this.contributionModel.create({
        goalId: new Types.ObjectId(goalId),
        amount,
        date,
        note: dto.note || null,
        userId,
        familyId,
        transactionId: transaction._id,
      });
    } catch (err) {
      await this.transactionModel.findByIdAndDelete(transaction._id).exec();
      throw err;
    }
  }

  async removeContribution(
    goalId: string,
    contributionId: string,
    familyId: string | null,
    userId: string,
  ): Promise<void> {
    await this.assertGoalAccess(goalId, familyId, userId);
    const objectId = new Types.ObjectId(goalId);
    const result = await this.contributionModel
      .findOneAndDelete({
        _id: contributionId,
        goalId: { $in: [goalId, objectId] },
      })
      .exec();
    if (!result) throw new NotFoundException('Contribution not found');
    if (result.transactionId) {
      await this.transactionModel
        .findByIdAndDelete(result.transactionId)
        .exec();
    }
  }

  private buildScope(familyId: string | null, userId: string): any {
    if (familyId) return { familyId };
    return { userId, familyId: null };
  }

  private async assertGoalAccess(
    goalId: string,
    familyId: string | null,
    userId: string,
  ): Promise<Goal> {
    const goal = await this.goalModel
      .findOne({ _id: goalId, ...this.buildScope(familyId, userId) })
      .exec();
    if (!goal) throw new NotFoundException('Goal not found');
    return goal;
  }

  private async contributionTotals(
    goalIds: any[],
  ): Promise<Map<string, number>> {
    const mixed: any[] = [];
    for (const id of goalIds) {
      const str = String(id);
      mixed.push(str);
      mixed.push(
        id instanceof Types.ObjectId ? id : new Types.ObjectId(str),
      );
    }
    const aggregated = await this.contributionModel
      .aggregate([
        { $match: { goalId: { $in: mixed } } },
        {
          $group: {
            _id: { $toString: '$goalId' },
            total: { $sum: '$amount' },
          },
        },
      ])
      .exec();
    const map = new Map<string, number>();
    for (const row of aggregated) map.set(row._id.toString(), row.total);
    return map;
  }

  private async calculateMonthlyReserve(
    familyId: string | null,
    userId: string,
  ): Promise<number> {
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth() - RESERVE_WINDOW_MONTHS,
      1,
    );
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const match: any = { date: { $gte: start, $lte: end } };
    if (familyId) match.familyId = familyId;
    else {
      match.userId = userId;
      match.familyId = null;
    }

    const rows = await this.transactionModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              y: { $year: '$date' },
              m: { $month: '$date' },
              type: '$type',
            },
            total: { $sum: '$amount' },
          },
        },
      ])
      .exec();

    const byMonth = new Map<string, { income: number; expense: number }>();
    for (const r of rows) {
      const key = `${r._id.y}-${r._id.m}`;
      const bucket = byMonth.get(key) || { income: 0, expense: 0 };
      if (r._id.type === 'income') bucket.income = r.total;
      else if (r._id.type === 'expense') bucket.expense = r.total;
      byMonth.set(key, bucket);
    }

    if (byMonth.size === 0) return 0;
    let net = 0;
    for (const b of byMonth.values()) net += b.income - b.expense;
    return net / RESERVE_WINDOW_MONTHS;
  }

  private projectGoal(
    targetAmount: number,
    targetDate: Date | null,
    currentAmount: number,
    monthlyReserve: number,
  ): GoalProjection {
    const remaining = Math.max(0, targetAmount - currentAmount);
    const monthsToTarget = targetDate
      ? this.monthsBetween(new Date(), new Date(targetDate))
      : null;

    if (remaining === 0) {
      return {
        currentAmount,
        remaining: 0,
        monthlyReserve,
        etaMonths: 0,
        monthsToTarget,
        status: 'achieved',
      };
    }

    if (monthlyReserve <= 0) {
      return {
        currentAmount,
        remaining,
        monthlyReserve,
        etaMonths: null,
        monthsToTarget,
        status: 'blocked',
      };
    }

    const etaMonths = Math.ceil(remaining / monthlyReserve);
    let status: GoalStatus = 'on-track';
    if (monthsToTarget !== null && etaMonths > monthsToTarget) {
      status = 'off-track';
    }

    return {
      currentAmount,
      remaining,
      monthlyReserve,
      etaMonths,
      monthsToTarget,
      status,
    };
  }

  private monthsBetween(from: Date, to: Date): number {
    const years = to.getFullYear() - from.getFullYear();
    const months = to.getMonth() - from.getMonth();
    return years * 12 + months;
  }
}
