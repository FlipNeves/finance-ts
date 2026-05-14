import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionSchema } from '../schemas/transaction.schema';
import { Family, FamilySchema } from '../schemas/family.schema';
import { Budget, BudgetSchema } from '../schemas/budget.schema';
import { User, UserSchema } from '../schemas/user.schema';
import {
  GoalContribution,
  GoalContributionSchema,
} from '../schemas/goal-contribution.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Family.name, schema: FamilySchema },
      { name: Budget.name, schema: BudgetSchema },
      { name: User.name, schema: UserSchema },
      { name: GoalContribution.name, schema: GoalContributionSchema },
    ]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
