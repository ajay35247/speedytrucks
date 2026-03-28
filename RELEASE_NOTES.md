# AP Trucking deployment hardening notes

## Fixed in this package
- Removed poisoned mobile lockfile and scrubbed internal resolved URLs from backend/admin lockfiles.
- Added dynamic Expo config via `mobile-app/app.config.ts` for environment-based API and socket URLs.
- Fixed mobile `.env.example` socket variable name to `EXPO_PUBLIC_SOCKET_BASE_URL`.
- Simplified mobile TypeScript config for Expo projects.
- Added `mobile-app/eas.json` for APK preview builds and Play Store AAB production builds.
- Added root `.gitignore` for cleaner GitHub commits.
- Added compiled worker entry support by creating `backend/src/worker.ts`.
- Updated backend `package.json` worker script to `node dist/worker.js`.
- Updated backend `tsconfig.json` to include Node types.
- Updated backend Dockerfile to prune dev dependencies in runtime image.
- Updated Railway worker start command to use the compiled worker output.

## Validation completed here
- Backend TypeScript build completed successfully.
- Admin web build completed successfully.

## Important deployment note
- Backend runtime still requires `npx prisma generate` during deployment so the generated Prisma client exists.
- In this container, Prisma engine download was blocked by network restrictions, so I could not fully boot the backend server here.
- Before production deploy, run:
  - `cd backend && npm ci && npx prisma generate && npm run build`
  - `cd frontend && npm ci && npm run build`
  - `cd mobile-app && npm install && npm run typecheck`
