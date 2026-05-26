import { Router } from 'express';
import { MessagesController } from './messages.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate.middleware';

const router = Router({ mergeParams: true }); // mergeParams for /contracts/:contractId/messages
const ctrl = new MessagesController();

router.get('/', authenticate, ctrl.list.bind(ctrl));
router.post('/', authenticate, [body('content').notEmpty()], validate, ctrl.send.bind(ctrl));
router.post('/file', authenticate, upload.single('file'), ctrl.sendFile.bind(ctrl));
router.patch('/read', authenticate, ctrl.markRead.bind(ctrl));

export default router;
