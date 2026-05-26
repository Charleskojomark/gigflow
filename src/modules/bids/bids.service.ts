import { Bid, IBid } from './bid.model';
import { Job } from '../jobs/job.model';
import { Contract } from '../contracts/contract.model';
import { Notification } from '../notifications/notification.model';
import { createError } from '../../middleware/error.middleware';
import { redis } from '../../config/redis';

interface PlaceBidInput {
  jobId: string;
  freelancerId: string;
  amount: number;
  deliveryDays: number;
  coverLetter: string;
}

export class BidsService {
  async place(input: PlaceBidInput): Promise<IBid> {
    const job = await Job.findById(input.jobId);
    if (!job) throw createError('Job not found', 404);
    if (job.status !== 'open') throw createError('This job is no longer accepting bids', 400);
    if (job.client.toString() === input.freelancerId) {
      throw createError('You cannot bid on your own job', 400);
    }

    const existing = await Bid.findOne({ job: input.jobId, freelancer: input.freelancerId });
    if (existing) throw createError('You have already placed a bid on this job', 409);

    const bid = await Bid.create({
      job: input.jobId,
      freelancer: input.freelancerId,
      amount: input.amount,
      deliveryDays: input.deliveryDays,
      coverLetter: input.coverLetter,
    });

    // Increment bid count
    await Job.findByIdAndUpdate(input.jobId, { $inc: { bidsCount: 1 } });

    // Notify client via Notification doc + Redis pub/sub
    await Notification.create({
      user: job.client,
      type: 'bid_received',
      title: 'New Bid Received',
      message: `A freelancer submitted a bid of $${input.amount} on your job "${job.title}"`,
      link: `/jobs/${job._id}/bids`,
    });
    await redis.publish('notifications', JSON.stringify({
      userId: job.client.toString(),
      type: 'bid_received',
      jobId: job._id,
      bidId: bid._id,
    }));

    return bid;
  }

  async listForJob(jobId: string, clientId: string): Promise<IBid[]> {
    const job = await Job.findById(jobId);
    if (!job) throw createError('Job not found', 404);
    if (job.client.toString() !== clientId) throw createError('Not authorized', 403);

    return Bid.find({ job: jobId })
      .populate('freelancer', 'name profilePhoto rating totalReviews skills')
      .sort({ createdAt: -1 });
  }

  async listMine(freelancerId: string): Promise<IBid[]> {
    return Bid.find({ freelancer: freelancerId })
      .populate('job', 'title budget status')
      .sort({ createdAt: -1 });
  }

  async accept(bidId: string, clientId: string): Promise<{ contract: InstanceType<typeof Contract> }> {
    const bid = await Bid.findById(bidId).populate<{ job: InstanceType<typeof Job> }>('job');
    if (!bid) throw createError('Bid not found', 404);

    const job = bid.job as InstanceType<typeof Job>;
    if ((job.client as unknown as { toString(): string }).toString() !== clientId) {
      throw createError('Not authorized', 403);
    }
    if (job.status !== 'open') throw createError('Job is not open', 400);

    // Accept bid, reject all others
    await Bid.updateMany(
      { job: job._id, _id: { $ne: bidId } },
      { status: 'rejected' },
    );
    bid.status = 'accepted';
    await bid.save();

    // Update job status
    await Job.findByIdAndUpdate(job._id, { status: 'in_progress', acceptedBid: bidId });

    // Create contract
    const contract = await Contract.create({
      job: job._id,
      bid: bidId,
      client: clientId,
      freelancer: bid.freelancer,
      totalAmount: bid.amount,
    });

    // Notify freelancer
    await Notification.create({
      user: bid.freelancer,
      type: 'bid_accepted',
      title: 'Your Bid Was Accepted!',
      message: `Congratulations! Your bid on "${(job as IJob).title}" was accepted.`,
      link: `/contracts/${contract._id}`,
    });
    await redis.publish('notifications', JSON.stringify({
      userId: bid.freelancer.toString(),
      type: 'bid_accepted',
      contractId: contract._id,
    }));

    return { contract };
  }

  async withdraw(bidId: string, freelancerId: string): Promise<void> {
    const bid = await Bid.findOne({ _id: bidId, freelancer: freelancerId });
    if (!bid) throw createError('Bid not found', 404);
    if (bid.status !== 'pending') throw createError('Can only withdraw pending bids', 400);
    bid.status = 'withdrawn';
    await bid.save();
    await Job.findByIdAndUpdate(bid.job, { $inc: { bidsCount: -1 } });
  }
}

// Re-export IJob for internal use
import { IJob } from '../jobs/job.model';
