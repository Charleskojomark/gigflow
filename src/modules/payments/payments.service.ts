import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../auth/auth.model';
import { Transaction } from './payment.model';
import { createError } from '../../middleware/error.middleware';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

const paystackApi = axios.create({
  baseURL: env.paystack.baseUrl,
  headers: {
    Authorization: `Bearer ${env.paystack.secretKey}`,
    'Content-Type': 'application/json',
  },
});

// Retry interceptor
paystackApi.interceptors.response.use(
  (res) => res,
  (err) => {
    logger.error('Paystack API error', err?.response?.data || err.message);
    return Promise.reject(err);
  },
);

export class PaymentsService {
  /** Initiate a Paystack payment for wallet deposit */
  async initiateDeposit(userId: string, email: string, amount: number): Promise<{ authorizationUrl: string; reference: string }> {
    const reference = uuidv4();
    const response = await paystackApi.post('/transaction/initialize', {
      email,
      amount: Math.round(amount * 100), // kobo
      reference,
      callback_url: `${env.clientUrl}/payment/callback`,
      metadata: { userId, type: 'deposit' },
    });
    const { authorization_url } = response.data.data;

    // Create pending transaction
    await Transaction.create({
      user: userId,
      type: 'deposit',
      amount,
      reference,
      status: 'pending',
    });

    return { authorizationUrl: authorization_url, reference };
  }

  /** Paystack webhook handler — verify HMAC signature */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const hash = crypto
      .createHmac('sha512', env.paystack.secretKey)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) throw createError('Invalid webhook signature', 400);

    const event = JSON.parse(rawBody.toString());
    if (event.event === 'charge.success') {
      const { reference, metadata } = event.data;
      const tx = await Transaction.findOne({ reference });
      if (!tx || tx.status === 'success') return;

      tx.status = 'success';
      await tx.save();

      if (metadata?.type === 'deposit') {
        await User.findByIdAndUpdate(metadata.userId, { $inc: { walletBalance: tx.amount } });
        logger.info(`Wallet topped up: ${metadata.userId} +${tx.amount}`);
      }
    }
  }

  /** Lock funds in escrow for a milestone */
  async lockEscrow(clientId: string, contractId: string, milestoneId: string, amount: number): Promise<void> {
    const client = await User.findById(clientId);
    if (!client) throw createError('User not found', 404);
    if (client.walletBalance < amount) throw createError('Insufficient wallet balance', 400);

    await User.findByIdAndUpdate(clientId, {
      $inc: { walletBalance: -amount, escrowBalance: amount },
    });

    await Transaction.create({
      user: clientId,
      type: 'escrow_lock',
      amount,
      reference: uuidv4(),
      status: 'success',
      contract: contractId,
      milestone: milestoneId,
    });
  }

  /** Freelancer requests withdrawal to bank */
  async requestWithdrawal(freelancerId: string, amount: number, bankCode: string, accountNumber: string): Promise<void> {
    const user = await User.findById(freelancerId);
    if (!user) throw createError('User not found', 404);
    if (user.walletBalance < amount) throw createError('Insufficient balance', 400);

    // Create recipient on Paystack
    const recipientRes = await paystackApi.post('/transferrecipient', {
      type: 'nuban',
      name: user.name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN',
    });
    const recipientCode = recipientRes.data.data.recipient_code;

    // Initiate transfer
    const reference = uuidv4();
    await paystackApi.post('/transfer', {
      source: 'balance',
      amount: Math.round(amount * 100),
      recipient: recipientCode,
      reason: 'GigFlow withdrawal',
      reference,
    });

    // Deduct from wallet
    await User.findByIdAndUpdate(freelancerId, { $inc: { walletBalance: -amount } });
    await Transaction.create({
      user: freelancerId,
      type: 'withdrawal',
      amount,
      reference,
      status: 'pending',
      metadata: { bankCode, accountNumber, recipientCode },
    });
  }

  async getTransactionHistory(userId: string): Promise<InstanceType<typeof Transaction>[]> {
    return Transaction.find({ user: userId }).sort({ createdAt: -1 }).limit(100);
  }
}
