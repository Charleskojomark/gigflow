import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const ctrl = new NotificationsController();

router.get('/', authenticate, ctrl.list.bind(ctrl));
router.patch('/:id/read', authenticate, ctrl.markRead.bind(ctrl));
router.patch('/read-all', authenticate, ctrl.markAllRead.bind(ctrl));

export default router;
