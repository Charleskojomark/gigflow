import mongoose, { Document, Schema } from 'mongoose';

export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface IBid extends Document {
  _id: mongoose.Types.ObjectId;
  job: mongoose.Types.ObjectId;
  freelancer: mongoose.Types.ObjectId;
  amount: number;
  deliveryDays: number;
  coverLetter: string;
  status: BidStatus;
  createdAt: Date;
  updatedAt: Date;
}

const bidSchema = new Schema<IBid>(
  {
    job: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    freelancer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    deliveryDays: { type: Number, required: true, min: 1 },
    coverLetter: { type: String, required: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

// One bid per freelancer per job
bidSchema.index({ job: 1, freelancer: 1 }, { unique: true });

export const Bid = mongoose.model<IBid>('Bid', bidSchema);
