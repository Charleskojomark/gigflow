# 🚀 GigFlow — Freelance Marketplace Platform API

A **production-grade full-stack REST API** for a freelance marketplace. Built with TypeScript, Node.js, Express, MongoDB, Redis, and Socket.IO — covering escrow payments, KYC verification, real-time chat, and file management.

---

## Tech Stack

| Technology | Role |
|---|---|
| **TypeScript + Node.js + Express** | Fully-typed REST API |
| **MongoDB + Mongoose** | Domain models with text search indexes and Mongoose transactions |
| **Redis (ioredis)** | JWT blacklist, rate limiting, feed caching (5-min TTL), pub/sub notifications |
| **Socket.IO** | `/chat` namespace (rooms per contract, typing indicators) + `/notifications` namespace |
| **JWT** | Short-lived access (15m) + long-lived refresh (7d) with rotation on refresh |
| **bcrypt** | Async password hashing in Mongoose `pre('save')` hook |
| **Multer + Cloudinary** | In-memory upload → stream to Cloudinary (no disk touch) |
| **Axios** | Paystack API integration with retry interceptor |
| **Nodemailer** | OTP + contract notification emails |
| **Twilio (via Axios)** | SMS OTP (no SDK — pure REST calls) |
| **Docker Compose** | `api` + `mongo` + `redis` + `nginx` |
| **Winston** | Structured JSON logging with daily log rotation |
| **Jest + Supertest** | API test suite (auth, jobs, payments) |

---

## Project Structure

```
gigflow/
├── src/
│   ├── config/           # env, db, redis, cloudinary
│   ├── middleware/        # auth, rateLimiter, upload, validate, error, requestId
│   ├── modules/
│   │   ├── auth/         # register, login, OTP, refresh, KYC upload
│   │   ├── users/        # profile CRUD, portfolio, wallet, photo upload
│   │   ├── jobs/         # CRUD, Redis-cached paginated feed, text search
│   │   ├── bids/         # place, accept (→ creates contract), withdraw
│   │   ├── contracts/    # milestones, deliverable upload, escrow release, reviews
│   │   ├── messages/     # REST history + Socket.IO relay, read receipts
│   │   ├── payments/     # Paystack deposit, webhook HMAC, escrow lock, withdrawal
│   │   ├── notifications/# in-app (Redis pub/sub → Socket.IO push)
│   │   ├── admin/        # user management, KYC review, job moderation, stats
│   │   └── health/       # /health (DB+Redis ping), /metrics (memory, uptime)
│   ├── sockets/          # chat.socket.ts, notification.socket.ts, index.ts
│   ├── utils/            # logger, apiResponse, token, otp, mailer, sms
│   ├── app.ts            # Express app factory
│   └── server.ts         # Bootstrap: DB, Redis, HTTP, Socket.IO, graceful shutdown
├── tests/
│   ├── auth.test.ts
│   ├── jobs.test.ts
│   └── payments.test.ts
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── .env.example
```

---

## Quick Start

### 1. Environment Setup
```bash
cp .env.example .env
# Fill in your credentials
```

### 2. Run with Docker Compose
```bash
docker-compose up -d
```

### 3. Run locally (development)
```bash
npm install
npm run dev
```

### 4. Run tests
```bash
npm test
```

---

## API Endpoints Summary

### Auth (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | Register, receive OTP via email |
| POST | `/login` | Get access + refresh tokens |
| POST | `/verify-email` | Verify email with OTP |
| POST | `/refresh` | Rotate JWT tokens |
| POST | `/logout` | Blacklist tokens in Redis |
| POST | `/kyc` | Upload KYC doc to Cloudinary |

### Jobs (`/api/jobs`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | Paginated + Redis-cached feed with filters |
| GET | `/:id` | Public | Job detail (increments view count) |
| POST | `/` | Client | Post a new job |
| PUT | `/:id` | Client | Edit job |
| DELETE | `/:id` | Client | Cancel job |

### Bids (`/api/bids`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/job/:jobId` | Freelancer | Place bid |
| GET | `/job/:jobId` | Client | View bids on job |
| GET | `/mine` | Freelancer | My bids |
| PATCH | `/:bidId/accept` | Client | Accept bid → creates Contract |
| PATCH | `/:bidId/withdraw` | Freelancer | Withdraw bid |

### Contracts (`/api/contracts`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Both | My contracts |
| GET | `/:id` | Both | Contract detail |
| POST | `/:id/milestones` | Client | Add milestone |
| POST | `/:id/milestones/:mId/deliverable` | Freelancer | Submit deliverable |
| PATCH | `/:id/milestones/:mId/approve` | Client | **Approve → atomic escrow release** |
| POST | `/:id/dispute` | Both | Flag dispute |
| POST | `/:id/review` | Client | Submit review (updates freelancer rating) |

### Payments (`/api/payments`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/deposit` | Any | Initiate Paystack deposit |
| POST | `/webhook` | Public | Paystack HMAC-verified webhook |
| POST | `/escrow/lock` | Client | Lock milestone funds in escrow |
| POST | `/withdraw` | Freelancer | Transfer to bank via Paystack |
| GET | `/history` | Any | Transaction history |

### Messages (`/api/contracts/:contractId/messages`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Party | Paginated message history |
| POST | `/` | Party | Send text message |
| POST | `/file` | Party | Send file (→ Cloudinary) |
| PATCH | `/read` | Party | Mark messages as read |

---

## Socket.IO Events

### `/chat` Namespace
```
client → join:contract    { contractId }
client → message:send     { contractId, content, type? }
server → message:new      { senderId, content, type, timestamp }
client → typing:start     contractId
server → typing:start     { userId }
client → typing:stop      contractId
server → typing:stop      { userId }
```

### `/notifications` Namespace
```
server → notification  { userId, type, ...payload }
```

---

## Key Design Patterns (Interview Talking Points)

- **Redis JWT blacklist**: `SETEX bl:<token> <ttl> 1` on logout — O(1) revocation check on every request
- **Redis feed cache**: `SETEX feed:jobs:<filter_hash> 300 <json>` — 5-min TTL, invalidated on any job write
- **Redis pub/sub**: Services publish to `notifications` channel; Socket.IO namespace subscribes and fans out
- **Mongoose session (transaction)**: Milestone approval atomically debits escrow and credits freelancer wallet
- **Multer → Cloudinary stream**: `multer.memoryStorage()` + `streamifier` → no temp files on disk
- **Paystack webhook HMAC**: Raw body preserved with `express.raw()` for SHA-512 signature verification
- **JWT refresh rotation**: Old refresh token blacklisted immediately; new pair issued — prevents replay attacks
