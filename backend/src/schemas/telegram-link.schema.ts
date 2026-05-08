import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class TelegramLink extends Document {
  @Prop({ required: true, unique: true })
  telegramChatId: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ default: 'pt-BR' })
  language: string;
}

export const TelegramLinkSchema = SchemaFactory.createForClass(TelegramLink);
