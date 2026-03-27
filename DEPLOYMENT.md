# Deployment Guide

## Production readiness status

This repository is now **code-hardened for production preparation**, but it is only truly production-ready after you set real infrastructure variables and complete live deployment validation.

What is already enforced in code:
- backend production boot now fails if `CORS_ORIGIN`, `DATABASE_URL`, or JWT secrets are unsafe or missing
- mobile production config now fails if API and socket URLs are still placeholders
- admin web no longer falls back to localhost in production builds
- CI now runs backend smoke checks after build

## 1) GitHub

Push the full repository to GitHub. This repo includes lockfiles for `backend`, `mobile-app`, and `admin-web`, plus CI for backend, mobile, and admin builds.

## 2) Railway backend service

Use the `backend` folder as the Railway service root directory.

Suggested Railway setup:
- Service root directory: `backend`
- Config file: `/backend/railway.toml`
- Add PostgreSQL service
- Add Redis service if you want queue/cache features

Required variables:
- `NODE_ENV=production`
- `PORT=4000`
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
- `TRUST_PROXY=1`

## 3) Railway worker service

Create a second Railway service from the same repo for background jobs.
- Service root directory: `backend`
- Config file: `/backend/railway.worker.toml`

## 4) Vercel admin web

Import the same GitHub repo into Vercel and select `admin-web` as the project root directory.

Suggested Vercel setup:
- Root Directory: `admin-web`
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

Add env vars in Vercel:
- `VITE_API_BASE_URL=https://<your-railway-domain>/api`

## 5) Mobile app

The Expo app is built separately with Expo/EAS after the backend API URL is live.

Required env vars before release build:
- `EXPO_PUBLIC_API_BASE_URL=https://<your-railway-domain>/api`
- `EXPO_PUBLIC_SOCKET_BASE_URL=https://<your-railway-domain>`
- `EXPO_PUBLIC_GOOGLE_MAPS_KEY=<your-real-google-maps-key>`

## 6) Final release validation still required

Before Play Store or customer release, you still must validate these on live infrastructure:
- OTP send and verify with Twilio
- payment order creation, capture, and webhook verification with Razorpay
- Prisma migrations against production PostgreSQL
- Redis-backed queue and worker processing
- real-device foreground and background GPS tracking
- admin dashboard against live backend auth
- crash/error monitoring with Sentry if enabled
