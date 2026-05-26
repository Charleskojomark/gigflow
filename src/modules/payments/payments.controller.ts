import { Request, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service';
import { successResponse } from '../../utils/apiResponse';

const paymentsService = new PaymentsService();

export class PaymentsController {
  async initiateDeposit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentsService.initiateDeposit(req.user!.userId, req.user!.email, req.body.amount);
      successResponse({ res, message: 'Payment initialized', data: result });
    } catch (err) { next(err); }
  }

  async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      await paymentsService.handleWebhook(req.body as Buffer, signature);
      res.sendStatus(200);
    } catch (err) { next(err); }
  }

  async lockEscrow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await paymentsService.lockEscrow(
        req.user!.userId,
        req.body.contractId,
        req.body.milestoneId,
        req.body.amount,
      );
      successResponse({ res, message: 'Funds locked in escrow' });
    } catch (err) { next(err); }
  }

  async requestWithdrawal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await paymentsService.requestWithdrawal(
        req.user!.userId,
        req.body.amount,
        req.body.bankCode,
        req.body.accountNumber,
      );
      successResponse({ res, message: 'Withdrawal initiated' });
    } catch (err) { next(err); }
  }

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const txs = await paymentsService.getTransactionHistory(req.user!.userId);
      successResponse({ res, message: 'Transaction history', data: txs });
    } catch (err) { next(err); }
  }
}
