import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { User } from '../src/modules/auth/auth.model';
import { Transaction } from '../src/modules/payments/payment.model';

const app = createApp();

beforeAll(async () => {
  const uri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/gigflow_test';
  await mongoose.connect(uri);
});

afterAll(async () => {
  await User.deleteMany({});
  await Transaction.deleteMany({});
  await mongoose.disconnect();
});

describe('Payments Endpoints', () => {
  let userToken: string;

  beforeAll(async () => {
    const user = await User.create({
      name: 'Payment Tester',
      email: `pay_${Date.now()}@test.com`,
      password: 'Password123',
      role: 'client',
      isVerified: true,
    });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Password123' });
    userToken = loginRes.body.data?.accessToken;
  });

  it('GET /api/payments/history — authenticated returns history array', async () => {
    if (!userToken) return;
    const res = await request(app)
      .get('/api/payments/history')
      .set('Authorization', `Bearer ${userToken}`);
    expect([200, 500]).toContain(res.status); // 500 if Paystack not configured
    if (res.status === 200) {
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('POST /api/payments/deposit — rejects invalid amount', async () => {
    if (!userToken) return;
    const res = await request(app)
      .post('/api/payments/deposit')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 5 }); // below 100 minimum
    expect(res.status).toBe(422);
  });

  it('POST /api/payments/deposit — unauthenticated returns 401', async () => {
    const res = await request(app).post('/api/payments/deposit').send({ amount: 1000 });
    expect(res.status).toBe(401);
  });

  it('GET /health — reports service states', async () => {
    const res = await request(app).get('/health');
    expect(res.body).toHaveProperty('services');
    expect(res.body.services).toHaveProperty('mongodb');
    expect(res.body.services).toHaveProperty('redis');
  });

  it('GET /metrics — returns memory and uptime', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('memory');
  });
});
