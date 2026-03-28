# AP Trucking

Production-clean monorepo for backend API, web frontend, and Expo mobile app.

## Folder structure

- `backend/` — Express + Prisma + PostgreSQL + Redis API
- `frontend/` — Vite React admin web frontend
- `mobile-app/` — Expo React Native app
- `.github/workflows/ci.yml` — CI for backend, frontend, and mobile typechecks/builds

## What was cleaned

- removed `node_modules` from all apps
- removed generated `dist` folders from tracked source
- renamed `admin-web/` to `frontend/`
- added root workspace `package.json` for easier local setup
- kept lockfiles so GitHub, Railway, and Vercel can install directly

## Quick start

### 1) Install

```bash
npm install
npm run install:all
```

### 2) Backend

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

### 3) Frontend

```bash
cd frontend
npm ci
npm run build
```

### 4) Mobile app

```bash
cd mobile-app
npm ci
npm run typecheck
```

## Required production env

### Backend
- `DATABASE_URL`
- `CORS_ORIGIN`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `REDIS_URL`

### Frontend
- `VITE_API_BASE_URL`

### Mobile app
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SOCKET_BASE_URL`
- `EXPO_PUBLIC_GOOGLE_MAPS_KEY`

## Deploy targets

- **GitHub**: push the whole repository
- **Railway**: deploy `backend/` as the API service and another `backend/` service for the worker
- **Vercel**: deploy `frontend/` with root directory set to `frontend`
- **Expo / EAS**: build `mobile-app/` separately after backend is live
