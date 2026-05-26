import { Request, Response, NextFunction } from 'express';
import { MessagesService } from './messages.service';
import { successResponse } from '../../utils/apiResponse';

const messagesService = new MessagesService();

export class MessagesController {
  async send(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const msg = await messagesService.send(req.params.contractId, req.user!.userId, req.body.content);
      successResponse({ res, statusCode: 201, message: 'Message sent', data: msg });
    } catch (err) { next(err); }
  }

  async sendFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) { res.status(400).json({ success: false, message: 'No file' }); return; }
      const msg = await messagesService.sendFile(req.params.contractId, req.user!.userId, req.file.buffer, req.file.originalname);
      successResponse({ res, statusCode: 201, message: 'File sent', data: msg });
    } catch (err) { next(err); }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const msgs = await messagesService.list(
        req.params.contractId, req.user!.userId,
        Number(req.query.page) || 1,
        Number(req.query.limit) || 50,
      );
      successResponse({ res, message: 'Messages retrieved', data: msgs });
    } catch (err) { next(err); }
  }

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await messagesService.markRead(req.params.contractId, req.user!.userId);
      successResponse({ res, message: 'Messages marked as read' });
    } catch (err) { next(err); }
  }
}
