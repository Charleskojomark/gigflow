import { Notification, INotification } from './notification.model';
import { createError } from '../../middleware/error.middleware';

export class NotificationsService {
  async getForUser(userId: string, page = 1, limit = 20): Promise<{ notifications: INotification[]; unreadCount: number }> {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments({ user: userId, isRead: false }),
    ]);
    return { notifications, unreadCount };
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    const n = await Notification.findOne({ _id: notificationId, user: userId });
    if (!n) throw createError('Notification not found', 404);
    n.isRead = true;
    await n.save();
  }

  async markAllRead(userId: string): Promise<void> {
    await Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
  }
}
