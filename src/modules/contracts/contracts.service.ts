import mongoose from 'mongoose';
import { Contract, IContract, IMilestone } from './contract.model';
import { User } from '../auth/auth.model';
import { Transaction } from '../payments/payment.model';
import { Notification } from '../notifications/notification.model';
import { Job } from '../jobs/job.model';
import { cloudinary } from '../../config/cloudinary';
import { createError } from '../../middleware/error.middleware';
import { redis } from '../../config/redis';
import streamifier from 'streamifier';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';

const streamUpload = (buffer: Buffer, folder: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (err, result) => {
        if (err || !result) return reject(err || new Error('Upload failed'));
        resolve(result.secure_url);
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

export class ContractsService {
  async getMyContracts(userId: string, role: string): Promise<IContract[]> {
    const query = role === 'client' ? { client: userId } : { freelancer: userId };
    return Contract.find(query)
      .populate('job', 'title category')
      .populate('client', 'name profilePhoto')
      .populate('freelancer', 'name profilePhoto')
      .sort({ createdAt: -1 });
  }

  async getById(contractId: string, userId: string): Promise<IContract> {
    const contract = await Contract.findById(contractId)
      .populate('job')
      .populate('client', 'name email profilePhoto')
      .populate('freelancer', 'name email profilePhoto')
      .populate('bid');
    if (!contract) throw createError('Contract not found', 404);

    const isParty =
      contract.client.toString() === userId ||
      (contract.freelancer as unknown as { toString(): string }).toString() === userId;
    if (!isParty) throw createError('Not authorized', 403);

    return contract;
  }

  async addMilestone(
    contractId: string,
    clientId: string,
    milestone: { title: string; description?: string; amount: number; deadline: Date | string },
  ): Promise<IContract> {
    const contract = await Contract.findOne({ _id: contractId, client: clientId, status: 'active' });
    if (!contract) throw createError('Active contract not found or unauthorized', 404);

    contract.milestones.push({
      title: milestone.title,
      description: milestone.description || '',
      amount: milestone.amount,
      deadline: new Date(milestone.deadline),
      status: 'pending',
    } as IMilestone);

    await contract.save();
    return contract;
  }

  async submitDeliverable(
    contractId: string,
    milestoneId: string,
    freelancerId: string,
    fileBuffer: Buffer,
    note?: string,
  ): Promise<IContract> {
    const contract = await Contract.findOne({
      _id: contractId,
      freelancer: freelancerId,
      status: 'active',
    });
    if (!contract) throw createError('Contract not found or unauthorized', 404);

    const milestone = (contract.milestones as unknown as mongoose.Types.DocumentArray<IMilestone>).id(milestoneId);
    if (!milestone) throw createError('Milestone not found', 404);
    if (milestone.status !== 'pending') throw createError('Milestone already submitted or approved', 400);

    const url = await streamUpload(fileBuffer, 'gigflow/deliverables');
    milestone.deliverableUrl = url;
    milestone.deliverableNote = note;
    milestone.status = 'submitted';
    milestone.submittedAt = new Date();

    await contract.save();

    // Notify client
    await Notification.create({
      user: contract.client,
      type: 'milestone_submitted',
      title: 'Milestone Deliverable Submitted',
      message: `Freelancer submitted a deliverable for milestone "${milestone.title}"`,
      link: `/contracts/${contractId}`,
    });
    await redis.publish('notifications', JSON.stringify({
      userId: contract.client.toString(),
      type: 'milestone_submitted',
      contractId,
      milestoneId,
    }));

    return contract;
  }

  async approveMilestone(
    contractId: string,
    milestoneId: string,
    clientId: string,
  ): Promise<IContract> {
    // Use MongoDB session for atomic escrow transfer
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const contract = await Contract.findOne({
        _id: contractId,
        client: clientId,
        status: 'active',
      }).session(session);
      if (!contract) throw createError('Contract not found or unauthorized', 404);

      const milestone = (contract.milestones as unknown as mongoose.Types.DocumentArray<IMilestone>).id(milestoneId);
      if (!milestone) throw createError('Milestone not found', 404);
      if (milestone.status !== 'submitted') throw createError('Milestone not submitted yet', 400);

      const commission = milestone.amount * (env.paystack.commissionPercent / 100);
      const freelancerAmount = milestone.amount - commission;

      // Transfer from client escrow → freelancer wallet
      await User.findByIdAndUpdate(contract.client, { $inc: { escrowBalance: -milestone.amount } }, { session });
      await User.findByIdAndUpdate(contract.freelancer, { $inc: { walletBalance: freelancerAmount } }, { session });

      // Record transaction
      await Transaction.create([{
        user: contract.freelancer,
        type: 'escrow_release',
        amount: freelancerAmount,
        reference: uuidv4(),
        status: 'success',
        contract: contractId,
        milestone: milestoneId,
        metadata: { commission, grossAmount: milestone.amount },
      }], { session });

      milestone.status = 'approved';
      milestone.approvedAt = new Date();
      await contract.save({ session });

      // Check if all milestones complete
      const allDone = contract.milestones.every((m) => m.status === 'approved');
      if (allDone) {
        contract.status = 'completed';
        await contract.save({ session });
        await Job.findByIdAndUpdate(contract.job, { status: 'completed' }, { session });
      }

      await session.commitTransaction();

      // Notify freelancer (outside session)
      await Notification.create({
        user: contract.freelancer,
        type: 'milestone_approved',
        title: 'Milestone Approved & Payment Released',
        message: `Your milestone "${milestone.title}" was approved. $${freelancerAmount} added to your wallet.`,
        link: `/contracts/${contractId}`,
      });
      await redis.publish('notifications', JSON.stringify({
        userId: (contract.freelancer as unknown as { toString(): string }).toString(),
        type: 'milestone_approved',
        contractId,
        amount: freelancerAmount,
      }));

      return contract;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async raiseDispute(contractId: string, userId: string, reason: string): Promise<IContract> {
    const contract = await Contract.findOne({
      _id: contractId,
      $or: [{ client: userId }, { freelancer: userId }],
      status: 'active',
    });
    if (!contract) throw createError('Contract not found or not active', 404);
    contract.status = 'disputed';
    await contract.save();
    return contract;
  }

  async submitReview(
    contractId: string,
    clientId: string,
    rating: number,
    comment: string,
  ): Promise<IContract> {
    const contract = await Contract.findOne({ _id: contractId, client: clientId, status: 'completed' });
    if (!contract) throw createError('Completed contract not found', 404);
    if (contract.review) throw createError('Review already submitted', 400);

    contract.review = { rating, comment, createdAt: new Date() };
    await contract.save();

    // Update freelancer aggregate rating
    const freelancer = await User.findById(contract.freelancer);
    if (freelancer) {
      const newTotal = freelancer.totalReviews + 1;
      const newRating = (freelancer.rating * freelancer.totalReviews + rating) / newTotal;
      freelancer.rating = Math.round(newRating * 10) / 10;
      freelancer.totalReviews = newTotal;
      await freelancer.save();
    }

    return contract;
  }
}
