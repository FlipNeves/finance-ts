import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

@Schema({ timestamps: true })
export class GoalContribution extends Document {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Goal', required: true })
  goalId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: String, default: null })
  note: string | null;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Family', default: null })
  familyId: Types.ObjectId | null;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Transaction', default: null })
  transactionId: Types.ObjectId | null;
}

export const GoalContributionSchema =
  SchemaFactory.createForClass(GoalContribution);
