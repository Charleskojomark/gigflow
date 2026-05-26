import { Message, IMessage } from './message.model';
import { Contract } from '../contracts/contract.model';
import { cloudinary } from '../../config/cloudinary';
import { createError } from '../../middleware/error.middleware';
import streamifier from 'streamifier';

const streamUpload = (buffer: Buffer): Promise<{ url: string; name: string }> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'gigflow/chat-files', resource_type: 'auto' },
      (err, result) => {
        if (err || !result) return reject(err || new Error('Upload failed'));
        resolve({ url: result.secure_url, name: result.original_filename });
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

export class MessagesService {
  private async assertParty(contractId: string, userId: string): Promise<void> {
    const contract = await Contract.findById(contractId).select('client freelancer');
    if (!contract) throw createError('Contract not found', 404);
    const isParty =
      contract.client.toString() === userId ||
      (contract.freelancer as unknown as { toString(): string }).toString() === userId;
    if (!isParty) throw createError('Not authorized', 403);
  }

  async send(contractId: string, senderId: string, content: string, type: 'text' | 'system' = 'text'): Promise<IMessage> {
    await this.assertParty(contractId, senderId);
    return Message.create({ contract: contractId, sender: senderId, content, type });
  }

  async sendFile(contractId: string, senderId: string, fileBuffer: Buffer, originalName: string): Promise<IMessage> {
    await this.assertParty(contractId, senderId);
    const { url, name } = await streamUpload(fileBuffer);
    return Message.create({
      contract: contractId,
      sender: senderId,
      content: `📎 ${originalName}`,
      type: 'file',
      fileUrl: url,
      fileName: originalName || name,
    });
  }

  async list(contractId: string, userId: string, page = 1, limit = 50): Promise<IMessage[]> {
    await this.assertParty(contractId, userId);
    return Message.find({ contract: contractId })
      .populate('sender', 'name profilePhoto')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
  }

  async markRead(contractId: string, userId: string): Promise<void> {
    await Message.updateMany(
      { contract: contractId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } },
    );
  }
}
