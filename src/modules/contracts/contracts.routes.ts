import { Router } from 'express';
import { ContractsController } from './contracts.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate.middleware';

const router = Router();
const ctrl = new ContractsController();

router.get('/', authenticate, ctrl.getMyContracts.bind(ctrl));
router.get('/:id', authenticate, ctrl.getById.bind(ctrl));

// Milestones
router.post('/:id/milestones', authenticate, authorize('client'),
  [
    body('title').notEmpty(),
    body('amount').isFloat({ min: 1 }),
    body('deadline').isISO8601(),
  ],
  validate,
  ctrl.addMilestone.bind(ctrl),
);

router.post(
  '/:id/milestones/:milestoneId/deliverable',
  authenticate,
  authorize('freelancer'),
  upload.single('file'),
  ctrl.submitDeliverable.bind(ctrl),
);

router.patch(
  '/:id/milestones/:milestoneId/approve',
  authenticate,
  authorize('client'),
  ctrl.approveMilestone.bind(ctrl),
);

// Dispute & Review
router.post('/:id/dispute', authenticate, [body('reason').notEmpty()], validate, ctrl.raiseDispute.bind(ctrl));
router.post('/:id/review', authenticate, authorize('client'),
  [body('rating').isInt({ min: 1, max: 5 }), body('comment').trim().notEmpty()],
  validate,
  ctrl.submitReview.bind(ctrl),
);

export default router;
