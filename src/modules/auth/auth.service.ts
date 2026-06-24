import bcrypt from 'bcryptjs';
import { User, IUser } from './auth.model';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  blacklistToken,
  isTokenBlacklisted,
} from '../../utils/token';
import { generateOtp, storeOtp, verifyOtp } from '../../utils/otp';
import { sendOtpEmail } from '../../utils/mailer';
import { sendOtpSms } from '../../utils/sms';
import { createError } from '../../middleware/error.middleware';
import { env } from '../../config/env';
import { cloudinary } from '../../config/cloudinary';
import streamifier from 'streamifier';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: 'client' | 'freelancer';
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const streamUpload = (buffer: Buffer, folder: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (err, result) => {
        if (err || !result) return reject(err || new Error('Cloudinary upload failed'));
        resolve(result.secure_url);
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

export class AuthService {
  async register(input: RegisterInput): Promise<{ user: IUser; tokens: AuthTokens }> {
    const existing = await User.findOne({ email: input.email });
    if (existing) throw createError('Email already in use', 409);

    const user = await User.create({
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role || 'freelancer',
    });

    // Generate & send OTP
    const otp = generateOtp();
    await storeOtp(user._id.toString(), otp);
    await sendOtpEmail(user.email, otp);

    const payload = { userId: user._id.toString(), role: user.role, email: user.email };
    const tokens: AuthTokens = {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
    };

    return { user, tokens };
  }

  async verifyEmail(userId: string, otp: string): Promise<IUser> {
    const valid = await verifyOtp(userId, otp);
    if (!valid) throw createError('Invalid or expired OTP', 400);

    const user = await User.findByIdAndUpdate(
      userId,
      { isVerified: true },
      { new: true },
    );
    if (!user) throw createError('User not found', 404);
    return user;
  }

  async resendOtp(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) throw createError('User not found', 404);
    const otp = generateOtp();
    await storeOtp(userId, otp);
    await sendOtpEmail(user.email, otp);
  }

  async login(email: string, password: string): Promise<{ user: IUser; tokens: AuthTokens }> {
    const user = await User.findOne({ email }).select('+password');
    if (!user) throw createError('Invalid credentials', 401);

    const match = await user.comparePassword(password);
    if (!match) throw createError('Invalid credentials', 401);

    if (!user.isVerified) throw createError('Please verify your email first', 403);
    if (!user.isActive) throw createError('Account has been suspended', 403);

    const payload = { userId: user._id.toString(), role: user.role, email: user.email };
    const tokens: AuthTokens = {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
    };

    return { user, tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    if (await isTokenBlacklisted(refreshToken)) {
      throw createError('Token has been revoked', 401);
    }
    try {
      const payload = verifyRefreshToken(refreshToken);
      // Rotate: blacklist old refresh token (7-day TTL)
      await blacklistToken(refreshToken, 7 * 24 * 3600);

      const newPayload = { userId: payload.userId, role: payload.role, email: payload.email };
      return {
        accessToken: generateAccessToken(newPayload),
        refreshToken: generateRefreshToken(newPayload),
      };
    } catch {
      throw createError('Invalid refresh token', 401);
    }
  }

  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    // Blacklist access token for 15 min
    await blacklistToken(accessToken, 15 * 60);
    if (refreshToken) await blacklistToken(refreshToken, 7 * 24 * 3600);
  }

  async uploadKyc(userId: string, fileBuffer: Buffer): Promise<IUser> {
    const url = await streamUpload(fileBuffer, 'gigflow/kyc');
    const user = await User.findByIdAndUpdate(
      userId,
      { kycDocumentUrl: url, kycStatus: 'pending' },
      { new: true },
    );
    if (!user) throw createError('User not found', 404);
    return user;
  }
}
