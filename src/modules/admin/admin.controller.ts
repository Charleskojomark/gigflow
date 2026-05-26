import { Request, Response, NextFunction } from 'express';
import { User } from '../auth/auth.model';
import { Job } from '../jobs/job.model';
import { Transaction } from '../payments/payment.model';
import { successResponse } from '../../utils/apiResponse';
import { createError } from '../../middleware/error.middleware';
import { env } from '../../config/env';

export class AdminController {
  // --- Users ---
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = 20;
      const [users, total] = await Promise.all([
        User.find().select('-password').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        User.countDocuments(),
      ]);
      successResponse({ res, message: 'Users list', data: users, meta: { total, page } });
    } catch (err) { next(err); }
  }

  async suspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }).select('-password');
      if (!user) throw createError('User not found', 404);
      successResponse({ res, message: 'User suspended', data: user });
    } catch (err) { next(err); }
  }

  async activateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true }).select('-password');
      if (!user) throw createError('User not found', 404);
      successResponse({ res, message: 'User activated', data: user });
    } catch (err) { next(err); }
  }

  async reviewKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.body; // 'approved' | 'rejected'
      if (!['approved', 'rejected'].includes(status)) throw createError('Invalid status', 400);
      const user = await User.findByIdAndUpdate(req.params.id, { kycStatus: status }, { new: true }).select('-password');
      if (!user) throw createError('User not found', 404);
      successResponse({ res, message: `KYC ${status}`, data: user });
    } catch (err) { next(err); }
  }

  // --- Jobs ---
  async listJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const [jobs, total] = await Promise.all([
        Job.find().populate('client', 'name email').sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20),
        Job.countDocuments(),
      ]);
      successResponse({ res, message: 'All jobs', data: jobs, meta: { total, page } });
    } catch (err) { next(err); }
  }

  async cancelJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await Job.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
      if (!job) throw createError('Job not found', 404);
      successResponse({ res, message: 'Job cancelled by admin', data: job });
    } catch (err) { next(err); }
  }

  // --- Platform Stats ---
  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [totalUsers, totalJobs, revenueAgg] = await Promise.all([
        User.countDocuments(),
        Job.countDocuments(),
        Transaction.aggregate([
          { $match: { type: 'commission', status: 'success' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);
      successResponse({
        res,
        message: 'Platform stats',
        data: {
          totalUsers,
          totalJobs,
          platformRevenue: revenueAgg[0]?.total || 0,
          commissionRate: `${env.paystack.commissionPercent}%`,
        },
      });
    } catch (err) { next(err); }
  }
}
