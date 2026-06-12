import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

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

  @Prop()
  bankAccount: string;

  @Prop({ default: false })
  isFixed: boolean;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Family', default: null })
  familyId: Types.ObjectId | null;

  // Provenance / audit trail. 'manual' for hand-entered transactions,
  // 'statement-import' for rows ingested from a bank statement.
  @Prop({ type: String, default: 'manual', enum: ['manual', 'statement-import'] })
  source: string;

  // Groups all transactions created in a single statement import, so a whole
  // batch can be audited or undone together.
  @Prop({ type: String, default: null })
  importBatchId: string | null;

  // Original statement line description, kept even after the user edits the
  // human-friendly description on review.
  @Prop({ type: String, default: null })
  originalDescription: string | null;

  // Stable fingerprint of the source line (date|amount|normalizedDesc), used to
  // detect duplicates and block re-importing the same statement.
  @Prop({ type: String, default: null })
  importFingerprint: string | null;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
