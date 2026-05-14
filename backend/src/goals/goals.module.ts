import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { Goal, GoalSchema } from '../schemas/goal.schema';
import {
  GoalContribution,
  GoalContributionSchema,
} from '../schemas/goal-contribution.schema';
import { Transaction, TransactionSchema } from '../schemas/transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Goal.name, schema: GoalSchema },
      { name: GoalContribution.name, schema: GoalContributionSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
