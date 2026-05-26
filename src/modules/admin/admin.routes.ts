import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();
const ctrl = new AdminController();

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

router.get('/stats', ctrl.getStats.bind(ctrl));

router.get('/users', ctrl.listUsers.bind(ctrl));
router.patch('/users/:id/suspend', ctrl.suspendUser.bind(ctrl));
router.patch('/users/:id/activate', ctrl.activateUser.bind(ctrl));
router.patch('/users/:id/kyc', ctrl.reviewKyc.bind(ctrl));

router.get('/jobs', ctrl.listJobs.bind(ctrl));
router.patch('/jobs/:id/cancel', ctrl.cancelJob.bind(ctrl));

export default router;
