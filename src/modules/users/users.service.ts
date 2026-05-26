import { User } from '../auth/auth.model';
import { Job } from '../jobs/job.model';
import { Contract } from '../contracts/contract.model';
import { Transaction } from '../payments/payment.model';
import { createError } from '../../middleware/error.middleware';

export class UsersService {
  async getProfile(userId: string) {
    const user = await User.findById(userId).select('-password');
    if (!user) throw createError('User not found', 404);
    return user;
  }

  async updateProfile(userId: string, updates: {
    name?: string;
    bio?: string;
    skills?: string[];
    hourlyRate?: number;
    phone?: string;
  }) {
    const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true }).select('-password');
    if (!user) throw createError('User not found', 404);
    return user;
  }

  async updateProfilePhoto(userId: string, photoUrl: string) {
    return User.findByIdAndUpdate(userId, { profilePhoto: photoUrl }, { new: true }).select('-password');
  }

  async addPortfolioItem(userId: string, item: { title: string; url: string; imageUrl?: string }) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { portfolio: item } },
      { new: true },
    ).select('-password');
    if (!user) throw createError('User not found', 404);
    return user;
  }

  async removePortfolioItem(userId: string, itemId: string) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { portfolio: { _id: itemId } } },
      { new: true },
    ).select('-password');
    if (!user) throw createError('User not found', 404);
    return user;
  }

  async getPublicProfile(userId: string) {
    const user = await User.findById(userId)
      .select('name bio skills hourlyRate profilePhoto portfolio rating totalReviews role createdAt');
    if (!user) throw createError('User not found', 404);
    return user;
  }

  async getWallet(userId: string) {
    const user = await User.findById(userId).select('walletBalance escrowBalance');
    if (!user) throw createError('User not found', 404);
    return { walletBalance: user.walletBalance, escrowBalance: user.escrowBalance };
  }
}
