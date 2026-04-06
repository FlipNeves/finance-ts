import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Family extends Document {
  @Prop({ required: true, unique: true })
  familyCode: string;

  @Prop({ type: [String], default: [] })
  customCategories: string[];

  @Prop({ type: [String], default: [] })
  bankAccounts: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  pendingMembers: Types.ObjectId[];
}

export const FamilySchema = SchemaFactory.createForClass(Family);
