import { Request, Response, NextFunction } from 'express';
import { ContractsService } from './contracts.service';
import { successResponse } from '../../utils/apiResponse';

const contractsService = new ContractsService();

export class ContractsController {
  async getMyContracts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contracts = await contractsService.getMyContracts(req.user!.userId, req.user!.role);
      successResponse({ res, message: 'Contracts retrieved', data: contracts });
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contract = await contractsService.getById(req.params.id, req.user!.userId);
      successResponse({ res, message: 'Contract retrieved', data: contract });
    } catch (err) { next(err); }
  }

  async addMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contract = await contractsService.addMilestone(req.params.id, req.user!.userId, req.body);
      successResponse({ res, statusCode: 201, message: 'Milestone added', data: contract });
    } catch (err) { next(err); }
  }

  async submitDeliverable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }
      const contract = await contractsService.submitDeliverable(
        req.params.id, req.params.milestoneId, req.user!.userId, req.file.buffer, req.body.note,
      );
      successResponse({ res, message: 'Deliverable submitted', data: contract });
    } catch (err) { next(err); }
  }

  async approveMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contract = await contractsService.approveMilestone(req.params.id, req.params.milestoneId, req.user!.userId);
      successResponse({ res, message: 'Milestone approved and payment released', data: contract });
    } catch (err) { next(err); }
  }

  async raiseDispute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contract = await contractsService.raiseDispute(req.params.id, req.user!.userId, req.body.reason);
      successResponse({ res, message: 'Dispute raised. Admin will review.', data: contract });
    } catch (err) { next(err); }
  }

  async submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const contract = await contractsService.submitReview(
        req.params.id, req.user!.userId, req.body.rating, req.body.comment,
      );
      successResponse({ res, message: 'Review submitted', data: contract });
    } catch (err) { next(err); }
  }
}
