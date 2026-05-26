import { Router } from 'express';
import { BidsController } from './bids.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate.middleware';

const router = Router();
const ctrl = new BidsController();

const bidValidator = [
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be positive'),
  body('deliveryDays').isInt({ min: 1 }).withMessage('Delivery days must be >= 1'),
  body('coverLetter').trim().isLength({ min: 50 }).withMessage('Cover letter must be at least 50 characters'),
];

// GET /api/bids/mine — freelancer's own bids
router.get('/mine', authenticate, authorize('freelancer'), ctrl.listMine.bind(ctrl));

// GET /api/bids/job/:jobId — client views bids on their job
router.get('/job/:jobId', authenticate, authorize('client'), ctrl.listForJob.bind(ctrl));

// POST /api/bids/job/:jobId — freelancer places bid
router.post('/job/:jobId', authenticate, authorize('freelancer'), bidValidator, validate, ctrl.place.bind(ctrl));

// PATCH /api/bids/:bidId/accept — client accepts a bid
router.patch('/:bidId/accept', authenticate, authorize('client'), ctrl.accept.bind(ctrl));

// PATCH /api/bids/:bidId/withdraw — freelancer withdraws their bid
router.patch('/:bidId/withdraw', authenticate, authorize('freelancer'), ctrl.withdraw.bind(ctrl));

export default router;
