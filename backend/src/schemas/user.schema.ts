import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Family' })
  familyId: Types.ObjectId;

  @Prop({ default: 'en-US' })
  preferredLanguage: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
