import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';

const router = Router();
const ctrl = new UsersController();

router.get('/me', authenticate, ctrl.getMe.bind(ctrl));
router.patch('/me', authenticate, ctrl.updateMe.bind(ctrl));
router.patch('/me/photo', authenticate, upload.single('photo'), ctrl.uploadPhoto.bind(ctrl));
router.get('/me/wallet', authenticate, ctrl.getWallet.bind(ctrl));
router.post('/me/portfolio', authenticate, ctrl.addPortfolio.bind(ctrl));
router.delete('/me/portfolio/:itemId', authenticate, ctrl.removePortfolio.bind(ctrl));
router.get('/:id', ctrl.getPublicProfile.bind(ctrl));

export default router;
