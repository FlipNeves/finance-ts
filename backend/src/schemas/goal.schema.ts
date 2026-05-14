import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Goal extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  targetAmount: number;

  @Prop({ type: Date, default: null })
  targetDate: Date | null;

  @Prop({ type: String, default: null })
  category: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Family', default: null })
  familyId: Types.ObjectId | null;
}

export const GoalSchema = SchemaFactory.createForClass(Goal);
