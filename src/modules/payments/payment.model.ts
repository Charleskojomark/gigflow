import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType =
  | 'deposit'
  | 'escrow_lock'
  | 'escrow_release'
  | 'withdrawal'
  | 'commission'
  | 'refund';

export type TransactionStatus = 'pending' | 'success' | 'failed';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number;
  reference: string;
  status: TransactionStatus;
  metadata: Record<string, unknown>;
  contract?: mongoose.Types.ObjectId;
  milestone?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['deposit', 'escrow_lock', 'escrow_release', 'withdrawal', 'commission', 'refund'],
      required: true,
    },
    amount: { type: Number, required: true },
    reference: { type: String, unique: true, required: true },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    contract: { type: Schema.Types.ObjectId, ref: 'Contract' },
    milestone: { type: Schema.Types.ObjectId },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
