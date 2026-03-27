import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Transaction extends Document {
  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: ['income', 'expense'] })
  type: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Family', required: true })
  familyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BankAccount' })
  bankAccountId: Types.ObjectId;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
