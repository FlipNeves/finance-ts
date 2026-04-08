import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Budget extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Family', default: null })
  familyId: Types.ObjectId | null;

  @Prop({ required: true })
  month: number; // 1-12

  @Prop({ required: true })
  year: number;

  @Prop({ required: true, default: 0 })
  totalLimit: number;

  @Prop({ type: [{ category: String, limit: Number }], default: [] })
  categoryLimits: { category: string; limit: number }[];
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);
