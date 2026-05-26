import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { successResponse } from '../../utils/apiResponse';
import { cloudinary } from '../../config/cloudinary';
import streamifier from 'streamifier';

const usersService = new UsersService();

const streamUpload = (buffer: Buffer): Promise<string> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'gigflow/profiles', transformation: [{ width: 400, height: 400, crop: 'fill' }] },
      (err, result) => {
        if (err || !result) return reject(err || new Error('Upload failed'));
        resolve(result.secure_url);
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

export class UsersController {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.getProfile(req.user!.userId);
      successResponse({ res, message: 'Profile retrieved', data: user });
    } catch (err) { next(err); }
  }

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.updateProfile(req.user!.userId, req.body);
      successResponse({ res, message: 'Profile updated', data: user });
    } catch (err) { next(err); }
  }

  async uploadPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) { res.status(400).json({ success: false, message: 'No file' }); return; }
      const url = await streamUpload(req.file.buffer);
      const user = await usersService.updateProfilePhoto(req.user!.userId, url);
      successResponse({ res, message: 'Profile photo updated', data: { profilePhoto: user?.profilePhoto } });
    } catch (err) { next(err); }
  }

  async addPortfolio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.addPortfolioItem(req.user!.userId, req.body);
      successResponse({ res, message: 'Portfolio item added', data: user });
    } catch (err) { next(err); }
  }

  async removePortfolio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.removePortfolioItem(req.user!.userId, req.params.itemId);
      successResponse({ res, message: 'Portfolio item removed', data: user });
    } catch (err) { next(err); }
  }

  async getPublicProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.getPublicProfile(req.params.id);
      successResponse({ res, message: 'Public profile', data: user });
    } catch (err) { next(err); }
  }

  async getWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const wallet = await usersService.getWallet(req.user!.userId);
      successResponse({ res, message: 'Wallet info', data: wallet });
    } catch (err) { next(err); }
  }
}
