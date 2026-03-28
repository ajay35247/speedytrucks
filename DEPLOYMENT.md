# Deployment guide

## 1. GitHub
- Upload the full repository root.
- Keep the monorepo structure intact: `backend`, `frontend`, `mobile-app`.
- Push the committed Prisma migration folder as part of every backend schema change.

## 2. Railway backend
- Use `backend/railway.toml`.
- Fill every variable listed in `RAILWAY_ENV_CHECKLIST.md` before the first deploy.
- Railway build now uses `npm install`, Prisma generate, Prisma migrate deploy, and TypeScript build.

## 3. Vercel frontend
- Set `VITE_API_BASE_URL` to the live Railway backend `/api` URL.
- Deploy the `frontend` project.
- After deploy, publish these public pages for Play Console:
  - `/privacy-policy.html`
  - `/account-deletion.html`

## 4. APK / Play Store
- Set `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SOCKET_BASE_URL`, and `EXPO_PUBLIC_GOOGLE_MAPS_KEY`.
- Restrict the Google Maps Android API key to package `com.aptrucking.mobile` and the release SHA-1.
- Build a production bundle with EAS.
- Test login, maps, background tracking, payments, and settlement updates on a physical Android phone.
