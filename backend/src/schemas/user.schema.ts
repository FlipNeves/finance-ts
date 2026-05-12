import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

const SENSITIVE_USER_FIELDS = [
  'passwordHash',
  'telegramLinkToken',
  'telegramLinkTokenExpiresAt',
] as const;

const stripSensitive = (_doc: any, ret: Record<string, any>) => {
  for (const k of SENSITIVE_USER_FIELDS) delete ret[k];
  return ret;
};

@Schema({
  timestamps: true,
  toJSON: { transform: stripSensitive },
  toObject: { transform: stripSensitive },
})
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [String], default: [] })
  customCategories: string[];

  @Prop({ type: [String], default: [] })
  bankAccounts: string[];

  @Prop({ type: Types.ObjectId, ref: 'Family', default: null })
  familyId: Types.ObjectId | null;

  @Prop({ default: 'en-US' })
  preferredLanguage: string;

  @Prop({ default: false })
  skipChatConfirmation: boolean;

  @Prop({ type: Number, default: null })
  telegramChatId: number | null;

  @Prop({ type: String, default: null })
  telegramLinkToken: string | null;

  @Prop({ type: Date, default: null })
  telegramLinkTokenExpiresAt: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
