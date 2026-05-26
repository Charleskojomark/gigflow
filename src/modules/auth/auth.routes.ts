import { Router } from 'express';
import { AuthController } from './auth.controller';
import {
  registerValidator,
  loginValidator,
  verifyOtpValidator,
  refreshTokenValidator,
} from './auth.validator';
import { validate } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { authLimiter } from '../../middleware/rateLimiter.middleware';
import { upload } from '../../middleware/upload.middleware';

const router = Router();
const ctrl = new AuthController();

/**
 * @route POST /api/auth/register
 * @desc  Register a new user, sends OTP via email
 */
router.post('/register', authLimiter, registerValidator, validate, ctrl.register.bind(ctrl));

/**
 * @route POST /api/auth/login
 * @desc  Authenticate and receive JWT tokens
 */
router.post('/login', authLimiter, loginValidator, validate, ctrl.login.bind(ctrl));

/**
 * @route POST /api/auth/verify-email
 * @desc  Verify email with 6-digit OTP (requires auth token from registration)
 */
router.post('/verify-email', authenticate, verifyOtpValidator, validate, ctrl.verifyEmail.bind(ctrl));

/**
 * @route POST /api/auth/resend-otp
 * @desc  Resend verification OTP
 */
router.post('/resend-otp', authenticate, ctrl.resendOtp.bind(ctrl));

/**
 * @route POST /api/auth/refresh
 * @desc  Rotate JWT tokens using refresh token
 */
router.post('/refresh', refreshTokenValidator, validate, ctrl.refresh.bind(ctrl));

/**
 * @route POST /api/auth/logout
 * @desc  Blacklist current tokens in Redis
 */
router.post('/logout', authenticate, ctrl.logout.bind(ctrl));

/**
 * @route POST /api/auth/kyc
 * @desc  Upload KYC identity document to Cloudinary
 */
router.post('/kyc', authenticate, upload.single('document'), ctrl.uploadKyc.bind(ctrl));

export default router;
