import mongoose, { Document, Schema } from 'mongoose';

export type ContractStatus = 'active' | 'completed' | 'disputed' | 'cancelled';
export type MilestoneStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export interface IMilestone {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  amount: number;
  deadline: Date;
  status: MilestoneStatus;
  deliverableUrl?: string;
  deliverableNote?: string;
  submittedAt?: Date;
  approvedAt?: Date;
}

export interface IContract extends Document {
  _id: mongoose.Types.ObjectId;
  job: mongoose.Types.ObjectId;
  bid: mongoose.Types.ObjectId;
  client: mongoose.Types.ObjectId;
  freelancer: mongoose.Types.ObjectId;
  totalAmount: number;
  escrowAmount: number;
  status: ContractStatus;
  milestones: IMilestone[];
  review?: {
    rating: number;
    comment: string;
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IMilestone>(
  {
    title: { type: String, required: true },
    description: String,
    amount: { type: Number, required: true, min: 0 },
    deadline: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'rejected'],
      default: 'pending',
    },
    deliverableUrl: String,
    deliverableNote: String,
    submittedAt: Date,
    approvedAt: Date,
  },
  { _id: true },
);

const contractSchema = new Schema<IContract>(
  {
    job: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    bid: { type: Schema.Types.ObjectId, ref: 'Bid', required: true },
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    totalAmount: { type: Number, required: true },
    escrowAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'completed', 'disputed', 'cancelled'],
      default: 'active',
    },
    milestones: [milestoneSchema],
    review: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      createdAt: Date,
    },
  },
  { timestamps: true },
);

export const Contract = mongoose.model<IContract>('Contract', contractSchema);
