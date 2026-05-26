import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate.middleware';
import express from 'express';

const router = Router();
const ctrl = new PaymentsController();

// Paystack webhook — raw body needed for HMAC verification
router.post('/webhook', express.raw({ type: 'application/json' }), ctrl.webhook.bind(ctrl));

router.get('/history', authenticate, ctrl.getHistory.bind(ctrl));

router.post(
  '/deposit',
  authenticate,
  [body('amount').isFloat({ min: 100 }).withMessage('Minimum deposit is 100')],
  validate,
  ctrl.initiateDeposit.bind(ctrl),
);

router.post(
  '/escrow/lock',
  authenticate,
  authorize('client'),
  [body('contractId').notEmpty(), body('milestoneId').notEmpty(), body('amount').isFloat({ min: 1 })],
  validate,
  ctrl.lockEscrow.bind(ctrl),
);

router.post(
  '/withdraw',
  authenticate,
  authorize('freelancer'),
  [
    body('amount').isFloat({ min: 1 }),
    body('bankCode').notEmpty(),
    body('accountNumber').notEmpty(),
  ],
  validate,
  ctrl.requestWithdrawal.bind(ctrl),
);

export default router;
