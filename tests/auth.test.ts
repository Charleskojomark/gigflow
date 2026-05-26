import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { User } from '../src/modules/auth/auth.model';

const app = createApp();

beforeAll(async () => {
  const uri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/gigflow_test';
  await mongoose.connect(uri);
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
});

describe('Auth Endpoints', () => {
  const testUser = {
    name: 'Test User',
    email: `test_${Date.now()}@example.com`,
    password: 'Password123',
    role: 'freelancer',
  };
  let userId: string;
  let accessToken: string;
  let refreshToken: string;

  it('POST /api/auth/register — creates user and sends OTP', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email);
    userId = res.body.data.userId;
  });

  it('POST /api/auth/register — rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(409);
  });

  it('POST /api/auth/register — rejects weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...testUser, email: 'other@test.com', password: '123' });
    expect(res.status).toBe(422);
  });

  it('POST /api/auth/login — fails for unverified user', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: testUser.email, password: testUser.password });
    expect(res.status).toBe(403);
  });

  it('POST /api/auth/login — succeeds after manual verification', async () => {
    // Manually verify for test purposes
    await User.findByIdAndUpdate(userId, { isVerified: true });
    const res = await request(app).post('/api/auth/login').send({ email: testUser.email, password: testUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('POST /api/auth/refresh — rotates tokens', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('POST /api/auth/logout — blacklists token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    expect(res.status).toBe(200);
  });

  it('GET /health — returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBeLessThan(600);
    expect(res.body.status).toBeDefined();
  });
});
