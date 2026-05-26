import { Request, Response, NextFunction } from 'express';
import { JobsService } from './jobs.service';
import { successResponse } from '../../utils/apiResponse';
import { JobStatus, JobCategory } from './job.model';

const jobsService = new JobsService();

export class JobsController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await jobsService.create({ ...req.body, clientId: req.user!.userId });
      successResponse({ res, statusCode: 201, message: 'Job posted successfully', data: job });
    } catch (err) { next(err); }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await jobsService.list({
        status: req.query.status as JobStatus | undefined,
        category: req.query.category as JobCategory | undefined,
        minBudget: req.query.minBudget ? Number(req.query.minBudget) : undefined,
        maxBudget: req.query.maxBudget ? Number(req.query.maxBudget) : undefined,
        search: req.query.q as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      });
      successResponse({ res, message: 'Jobs retrieved', data: result.jobs, meta: { total: result.total, page: result.page, pages: result.pages } });
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await jobsService.getById(req.params.id);
      successResponse({ res, message: 'Job retrieved', data: job });
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await jobsService.update(req.params.id, req.user!.userId, req.body);
      successResponse({ res, message: 'Job updated', data: job });
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await jobsService.delete(req.params.id, req.user!.userId);
      successResponse({ res, message: 'Job cancelled' });
    } catch (err) { next(err); }
  }
}
