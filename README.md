# 🚛 SpeedyTrucks — Production-Ready Freight Marketplace

India's full-stack logistics marketplace with real authentication, KYC, bidding, payments, and GPS tracking.

---

## 🏗️ Architecture Overview

```
speedytrucks/
├── frontend/                    # React + Vite + Tailwind (Vercel)
│   └── src/
│       ├── pages/               # Route-level page components
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── MarketplacePage.jsx
│       │   ├── KYCPage.jsx
│       │   ├── AdminPage.jsx
│       │   ├── ForgotPasswordPage.jsx
│       │   └── ResetPasswordPage.jsx
│       ├── components/
│       │   ├── auth/            # LoginForm, RegisterForm
│       │   └── shared/          # Layout (sidebar + header)
│       ├── services/api.js      # Axios client + all API calls
│       ├── context/AuthContext  # Global auth state
│       └── App.jsx              # Router + protected routes
│
└── backend/                     # Node.js + Express (Railway/Render)
    └── src/
        ├── server.js            # Entry point
        ├── config/
        │   ├── db.js            # MongoDB connection
        │   └── redis.js         # Redis client (OTP/cache)
        ├── models/
        │   ├── User.model.js    # Users (bcrypt, roles, wallet)
        │   ├── FreightLoad.model.js
        │   ├── Truck.model.js
        │   ├── Bid.model.js
        │   ├── KYC.model.js
        │   ├── AuditLog.model.js
        │   └── WalletTransaction.model.js
        ├── controllers/
        │   ├── auth.controller.js       # Register, login, OTP, JWT, 2FA
        │   ├── admin.controller.js      # User mgmt, KYC approval, audit logs
        │   ├── freight.controller.js    # Load CRUD
        │   ├── bid.controller.js        # Bidding system
        │   ├── kyc.controller.js        # Document upload (Cloudinary)
        │   └── payment.controller.js   # Razorpay + wallet
        ├── routes/                      # Express routers
        ├── middlewares/
        │   ├── auth.middleware.js       # JWT verify + role-based access
        │   ├── rateLimiter.js           # express-rate-limit configs
        │   └── errorHandler.js         # Global error handler
        ├── services/
        │   ├── otp.service.js           # Twilio SMS + Redis OTP store
        │   ├── email.service.js         # Nodemailer transactional emails
        │   ├── audit.service.js         # Audit log writes
        │   └── payment.service.js       # Razorpay + wallet operations
        └── utils/
            ├── jwt.js                   # Token generation + cookie helpers
            ├── logger.js                # Winston structured logging
            └── response.js             # Consistent API response helpers
```

---

## 🔐 Security Features

| Feature | Implementation |
|---|---|
| Password hashing | `bcryptjs` with 12 salt rounds |
| JWT Access Tokens | 15-minute expiry, signed with HS256 |
| JWT Refresh Tokens | 7-day expiry, stored in httpOnly cookie |
| OTP Storage | Redis with 5-min TTL, max 3 attempts |
| Rate Limiting | Different limits per route type |
| Helmet | Security headers (CSP, HSTS, etc.) |
| CORS | Strict origin allowlist |
| NoSQL Injection | `express-mongo-sanitize` |
| Account Lockout | 5 failed attempts → 30min lock |
| 2FA | SMS OTP via Twilio |
| Audit Logs | All actions logged to MongoDB |

---

## 👤 User Roles & Permissions

| Role | Capabilities |
|---|---|
| **Admin** | Full access, user management, KYC approval, audit logs |
| **Shipper** | Post loads, track freight, make payments |
| **Truck Owner** | Register trucks, bid on loads, manage earnings |
| **Broker** | Search & match, negotiate, earn commission |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Redis instance (Upstash recommended)
- Twilio account (SMS OTP)
- Cloudinary account (document storage)
- Razorpay account (payments)

### Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in all environment variables
npm install
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 API Endpoints

### Auth (`/api/auth`)
- `POST /register` — create account
- `POST /verify-phone` — verify OTP
- `POST /login` — email + password
- `POST /otp/request` — request OTP login
- `POST /otp/verify` — verify OTP login
- `POST /refresh` — refresh access token
- `POST /logout` — invalidate session
- `POST /forgot-password` — send reset email
- `POST /reset-password` — reset with token
- `GET /me` — get current user

### Freight (`/api/freight`)
- `GET /` — search loads (filterable)
- `POST /` — post new load (shipper)
- `GET /my` — my loads
- `PUT /:id` — update load
- `DELETE /:id` — cancel load

### Bids (`/api/bids`)
- `POST /` — place bid (truck owner)
- `GET /load/:id` — bids on a load
- `PATCH /:id/accept` — accept bid
- `PATCH /:id/withdraw` — withdraw bid

### KYC (`/api/kyc`)
- `GET /status` — get KYC status
- `POST /upload/:docType` — upload document

### Payments (`/api/payments`)
- `POST /create-order` — create Razorpay order
- `POST /verify` — verify payment
- `GET /wallet` — wallet balance + history
- `POST /wallet/withdraw` — withdraw to UPI

### Admin (`/api/admin`) — admin only
- `GET /users` — list users
- `PATCH /users/:id/suspend` — suspend
- `PATCH /users/:id/reinstate` — reinstate
- `GET /kyc/pending` — pending KYCs
- `PATCH /kyc/:id/approve` — approve KYC
- `GET /audit-logs` — platform logs
- `GET /stats` — dashboard stats

---

## ☁️ Deployment

### Frontend → Vercel
1. Connect GitHub repo to Vercel
2. Set root to `frontend/`
3. Set `VITE_API_URL` env var to your backend URL
4. Deploy!

### Backend → Railway
1. Connect GitHub repo to Railway
2. Set root to `backend/`
3. Add all env vars from `.env.example`
4. Railway auto-detects Node.js and deploys

### Database → MongoDB Atlas
1. Create free cluster
2. Whitelist Railway IP (or `0.0.0.0/0` for dev)
3. Copy connection string to `MONGODB_URI`

---

## 📱 OTP Flow

```
User enters phone
    ↓
POST /auth/otp/request
    ↓
OTP generated (6 digits)
    ↓
Stored in Redis with 5-min TTL
    ↓
Twilio sends SMS
    ↓
User enters OTP
    ↓
POST /auth/otp/verify
    ↓
Redis checks OTP (max 3 attempts)
    ↓
OTP deleted after successful use
    ↓
JWT tokens issued
```

---

## 💳 Payment Flow

```
Shipper accepts bid
    ↓
POST /payments/create-order (Razorpay)
    ↓
Frontend opens Razorpay checkout
    ↓
User pays via UPI/card/wallet
    ↓
POST /payments/verify (signature check)
    ↓
Truck owner wallet credited (amount - 5% commission)
    ↓
Load status → "paid"
```
