import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { successResponse } from '../../utils/apiResponse';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await authService.register(req.body);
      successResponse({
        res,
        statusCode: 201,
        message: 'Registration successful. Check your email for OTP.',
        data: {
          userId: user._id,
          email: user.email,
          role: user.role,
          ...tokens,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.verifyEmail(req.user!.userId, req.body.otp);
      successResponse({ res, message: 'Email verified successfully', data: { userId: user._id } });
    } catch (err) {
      next(err);
    }
  }

  async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.resendOtp(req.user!.userId);
      successResponse({ res, message: 'OTP resent to your email' });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await authService.login(req.body.email, req.body.password);
      successResponse({
        res,
        message: 'Login successful',
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            kycStatus: user.kycStatus,
          },
          ...tokens,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tokens = await authService.refresh(req.body.refreshToken);
      successResponse({ res, message: 'Tokens refreshed', data: tokens });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.headers.authorization!.split(' ')[1];
      await authService.logout(token, req.body.refreshToken);
      successResponse({ res, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  async uploadKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }
      const user = await authService.uploadKyc(req.user!.userId, req.file.buffer);
      successResponse({ res, message: 'KYC document uploaded. Awaiting admin review.', data: { kycStatus: user.kycStatus } });
    } catch (err) {
      next(err);
    }
  }
}
