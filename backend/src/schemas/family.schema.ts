import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Family extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  familyCode: string;

  @Prop({ type: [String], default: [] })
  customCategories: string[];
}

export const FamilySchema = SchemaFactory.createForClass(Family);
