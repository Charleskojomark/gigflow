import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'bid_received'
  | 'bid_accepted'
  | 'bid_rejected'
  | 'contract_started'
  | 'milestone_submitted'
  | 'milestone_approved'
  | 'payment_received'
  | 'withdrawal_processed'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'dispute_raised'
  | 'message_received';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'bid_received',
        'bid_accepted',
        'bid_rejected',
        'contract_started',
        'milestone_submitted',
        'milestone_approved',
        'payment_received',
        'withdrawal_processed',
        'kyc_approved',
        'kyc_rejected',
        'dispute_raised',
        'message_received',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    link: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
