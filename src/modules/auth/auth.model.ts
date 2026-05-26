import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'client' | 'freelancer' | 'admin';
export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  isVerified: boolean;
  kycStatus: KycStatus;
  kycDocumentUrl?: string;
  bio?: string;
  skills: string[];
  hourlyRate?: number;
  profilePhoto?: string;
  portfolio: Array<{ title: string; url: string; imageUrl?: string }>;
  walletBalance: number;
  escrowBalance: number;
  rating: number;
  totalReviews: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, sparse: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['client', 'freelancer', 'admin'], default: 'freelancer' },
    isVerified: { type: Boolean, default: false },
    kycStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    kycDocumentUrl: String,
    bio: String,
    skills: [{ type: String }],
    hourlyRate: Number,
    profilePhoto: String,
    portfolio: [
      {
        title: String,
        url: String,
        imageUrl: String,
      },
    ],
    walletBalance: { type: Number, default: 0 },
    escrowBalance: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Hash password before save
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

// Text search index
userSchema.index({ name: 'text', skills: 'text', bio: 'text' });

export const User = mongoose.model<IUser>('User', userSchema);
