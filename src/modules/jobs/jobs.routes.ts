import { Router } from 'express';
import { JobsController } from './jobs.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate.middleware';

const router = Router();
const ctrl = new JobsController();

const jobValidator = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().isLength({ min: 20 }).withMessage('Description must be at least 20 characters'),
  body('category').notEmpty().withMessage('Category is required'),
  body('budget').isFloat({ min: 1 }).withMessage('Budget must be positive'),
  body('deadline').isISO8601().withMessage('Deadline must be a valid date'),
];

router.get('/', list);
router.get('/:id', getById);
router.post('/', authenticate, authorize('client'), jobValidator, validate, create);
router.put('/:id', authenticate, authorize('client'), validate, update);
router.delete('/:id', authenticate, authorize('client'), deleteJob);

function list(req: Parameters<typeof ctrl.list>[0], res: Parameters<typeof ctrl.list>[1], next: Parameters<typeof ctrl.list>[2]) { return ctrl.list(req, res, next); }
function getById(req: Parameters<typeof ctrl.getById>[0], res: Parameters<typeof ctrl.getById>[1], next: Parameters<typeof ctrl.getById>[2]) { return ctrl.getById(req, res, next); }
function create(req: Parameters<typeof ctrl.create>[0], res: Parameters<typeof ctrl.create>[1], next: Parameters<typeof ctrl.create>[2]) { return ctrl.create(req, res, next); }
function update(req: Parameters<typeof ctrl.update>[0], res: Parameters<typeof ctrl.update>[1], next: Parameters<typeof ctrl.update>[2]) { return ctrl.update(req, res, next); }
function deleteJob(req: Parameters<typeof ctrl.delete>[0], res: Parameters<typeof ctrl.delete>[1], next: Parameters<typeof ctrl.delete>[2]) { return ctrl.delete(req, res, next); }

export default router;
