import { Request, Response, NextFunction } from 'express';
import { NotificationsService } from './notifications.service';
import { successResponse } from '../../utils/apiResponse';

const notificationsService = new NotificationsService();

export class NotificationsController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationsService.getForUser(
        req.user!.userId,
        Number(req.query.page) || 1,
        Number(req.query.limit) || 20,
      );
      successResponse({ res, message: 'Notifications retrieved', data: result.notifications, meta: { unreadCount: result.unreadCount } });
    } catch (err) { next(err); }
  }

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationsService.markRead(req.params.id, req.user!.userId);
      successResponse({ res, message: 'Marked as read' });
    } catch (err) { next(err); }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationsService.markAllRead(req.user!.userId);
      successResponse({ res, message: 'All notifications marked as read' });
    } catch (err) { next(err); }
  }
}
