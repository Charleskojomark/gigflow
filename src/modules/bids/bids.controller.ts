import { Request, Response, NextFunction } from 'express';
import { BidsService } from './bids.service';
import { successResponse } from '../../utils/apiResponse';

const bidsService = new BidsService();

export class BidsController {
  async place(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bid = await bidsService.place({ ...req.body, jobId: req.params.jobId, freelancerId: req.user!.userId });
      successResponse({ res, statusCode: 201, message: 'Bid placed successfully', data: bid });
    } catch (err) { next(err); }
  }

  async listForJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bids = await bidsService.listForJob(req.params.jobId, req.user!.userId);
      successResponse({ res, message: 'Bids retrieved', data: bids });
    } catch (err) { next(err); }
  }

  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bids = await bidsService.listMine(req.user!.userId);
      successResponse({ res, message: 'Your bids', data: bids });
    } catch (err) { next(err); }
  }

  async accept(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { contract } = await bidsService.accept(req.params.bidId, req.user!.userId);
      successResponse({ res, statusCode: 201, message: 'Bid accepted. Contract created.', data: contract });
    } catch (err) { next(err); }
  }

  async withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await bidsService.withdraw(req.params.bidId, req.user!.userId);
      successResponse({ res, message: 'Bid withdrawn' });
    } catch (err) { next(err); }
  }
}
