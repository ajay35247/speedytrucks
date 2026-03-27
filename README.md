# AP Trucking Production Final Hardening

This package has been upgraded beyond the previous stage and now includes stricter production controls in the backend foundation.

## What was fixed

- refresh-token rotation now tied to persisted device sessions
- session invalidation on logout, logout-all, and refresh-token reuse detection
- active session validation on every authenticated request
- session listing and remote session revocation endpoints
- OTP throttling backed by persisted counters
- structured logging and request-aware error responses
- Razorpay webhook audit persistence
- wallet ledger entries for captured payments and paid settlements
- database-backed operational jobs for OTP cleanup, session expiry, and stale trip maintenance
- trip location history storage plus socket-based live location fan-out
- fraud signal generation for risky GPS jumps, low GPS accuracy, high speed, and risky payments
- stronger Prisma indexing for core load, trip, session, payment, and ledger access paths

## New important backend endpoints

- `POST /api/auth/refresh-token`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `GET /api/auth/sessions`
- `POST /api/auth/revoke-session`
- `POST /api/payments/webhook`
- `GET /api/payments/wallet`

## Required setup before real deployment

1. Run `npm install` in `backend`, `mobile-app`, and `admin-web`.
2. In `backend`, run `npx prisma generate`.
3. Create and apply a Prisma migration for the updated schema.
4. Set real production secrets in `backend/.env`.
5. Run the API server and the worker process separately:
   - `npm run dev`
   - `npm run worker`
6. Configure Twilio Verify, Razorpay webhook secret, PostgreSQL, and Redis.
7. Test Expo background tracking on a real Android device.

## Remaining work outside this zip

- full real SMS and payment provider credentials in live infra
- cloud storage wiring for KYC and trip documents
- Firebase push notification credentials and templates
- production observability dashboards and alert routing
- full automated CI execution against a live PostgreSQL test database

## Production caution

This codebase is now much closer to a serious beta / controlled production rollout, but you still need:

- a real Prisma migration applied to your database
- provider credentials
- environment hardening
- end-to-end QA on actual devices and servers


## Production release notes

- Set all backend production secrets before deploy.
- Set `VITE_API_BASE_URL` for admin-web before Vercel build.
- Set `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_SOCKET_BASE_URL` before EAS production build.
- Use `PLAYSTORE_RELEASE_CHECKLIST.md` and publish a real privacy policy before Play Store submission.
