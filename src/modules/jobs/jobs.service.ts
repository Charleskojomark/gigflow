import { Job, IJob, JobStatus, JobCategory } from './job.model';
import { redis } from '../../config/redis';
import { createError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';

const FEED_CACHE_TTL = 300; // 5 minutes

interface CreateJobInput {
  title: string;
  description: string;
  category: JobCategory;
  tags?: string[];
  budget: number;
  deadline: Date | string;
  clientId: string;
}

interface JobFilter {
  status?: JobStatus;
  category?: JobCategory;
  minBudget?: number;
  maxBudget?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export class JobsService {
  async create(input: CreateJobInput): Promise<IJob> {
    const job = await Job.create({
      title: input.title,
      description: input.description,
      category: input.category,
      tags: input.tags || [],
      budget: input.budget,
      deadline: new Date(input.deadline),
      client: input.clientId,
    });
    // Invalidate feed cache on new job
    await redis.del('feed:jobs');
    return job;
  }

  async list(filter: JobFilter): Promise<{ jobs: IJob[]; total: number; page: number; pages: number }> {
    const page = filter.page || 1;
    const limit = Math.min(filter.limit || 20, 50);
    const cacheKey = `feed:jobs:${JSON.stringify(filter)}`;

    // Try Redis cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug(`Job feed served from cache: ${cacheKey}`);
      return JSON.parse(cached);
    }

    const query: Record<string, unknown> = { status: filter.status || 'open' };
    if (filter.category) query.category = filter.category;
    if (filter.minBudget || filter.maxBudget) {
      query.budget = {
        ...(filter.minBudget && { $gte: filter.minBudget }),
        ...(filter.maxBudget && { $lte: filter.maxBudget }),
      };
    }
    if (filter.search) {
      query.$text = { $search: filter.search };
    }

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate('client', 'name profilePhoto rating')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Job.countDocuments(query),
    ]);

    const result = { jobs: jobs as unknown as IJob[], total, page, pages: Math.ceil(total / limit) };
    await redis.setex(cacheKey, FEED_CACHE_TTL, JSON.stringify(result));
    return result;
  }

  async getById(id: string): Promise<IJob> {
    const job = await Job.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true },
    ).populate('client', 'name profilePhoto rating totalReviews');
    if (!job) throw createError('Job not found', 404);
    return job;
  }

  async update(id: string, clientId: string, updates: Partial<IJob>): Promise<IJob> {
    const job = await Job.findOne({ _id: id, client: clientId });
    if (!job) throw createError('Job not found or unauthorized', 404);
    if (job.status !== 'open') throw createError('Only open jobs can be edited', 400);

    Object.assign(job, updates);
    await job.save();
    await redis.del('feed:jobs');
    return job;
  }

  async delete(id: string, clientId: string): Promise<void> {
    const job = await Job.findOne({ _id: id, client: clientId });
    if (!job) throw createError('Job not found or unauthorized', 404);
    if (job.status === 'in_progress') throw createError('Cannot delete an active contract job', 400);
    job.status = 'cancelled';
    await job.save();
    await redis.del('feed:jobs');
  }
}
