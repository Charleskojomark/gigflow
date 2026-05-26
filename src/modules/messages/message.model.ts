import mongoose, { Document, Schema } from 'mongoose';

export type MessageType = 'text' | 'file' | 'system';

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  contract: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  type: MessageType;
  fileUrl?: string;
  fileName?: string;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    contract: { type: Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['text', 'file', 'system'], default: 'text' },
    fileUrl: String,
    fileName: String,
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

messageSchema.index({ contract: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
