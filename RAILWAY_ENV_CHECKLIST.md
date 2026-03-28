# Railway environment checklist

Set these variables before the first backend deploy:

- `NODE_ENV=production`
- `PORT=4000`
- `CORS_ORIGIN=https://your-frontend-domain.vercel.app`
- `DATABASE_URL=` your managed PostgreSQL connection string
- `JWT_ACCESS_SECRET=` strong random secret
- `JWT_REFRESH_SECRET=` strong random secret
- `TWILIO_ACCOUNT_SID=` Twilio SID
- `TWILIO_AUTH_TOKEN=` Twilio auth token
- `TWILIO_VERIFY_SERVICE_SID=` Twilio Verify service SID
- `RAZORPAY_KEY_ID=` live key ID
- `RAZORPAY_KEY_SECRET=` live key secret
- `RAZORPAY_WEBHOOK_SECRET=` live webhook secret
- `REDIS_URL=` managed Redis connection string
- `SENTRY_DSN=` optional

Post-deploy checks:
1. `/healthz` returns `status: ok`
2. OTP send/verify works with Twilio live credentials
3. `npx prisma migrate deploy` succeeds during Railway build
4. Razorpay webhook endpoint validates signatures correctly
