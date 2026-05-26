import mongoose, { Document, Schema } from 'mongoose';

export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type JobCategory =
  | 'web_development'
  | 'mobile_development'
  | 'design'
  | 'writing'
  | 'data_science'
  | 'marketing'
  | 'video_audio'
  | 'other';

export interface IJob extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: JobCategory;
  tags: string[];
  budget: number;
  deadline: Date;
  status: JobStatus;
  client: mongoose.Types.ObjectId;
  acceptedBid?: mongoose.Types.ObjectId;
  bidsCount: number;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'web_development',
        'mobile_development',
        'design',
        'writing',
        'data_science',
        'marketing',
        'video_audio',
        'other',
      ],
      required: true,
    },
    tags: [{ type: String }],
    budget: { type: Number, required: true, min: 0 },
    deadline: { type: Date, required: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'cancelled'],
      default: 'open',
    },
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    acceptedBid: { type: Schema.Types.ObjectId, ref: 'Bid' },
    bidsCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
);

jobSchema.index({ title: 'text', description: 'text', tags: 'text' });
jobSchema.index({ status: 1, category: 1, budget: 1 });

export const Job = mongoose.model<IJob>('Job', jobSchema);
