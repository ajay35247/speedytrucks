-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SHIPPER', 'DRIVER');
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "LoadStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');
CREATE TYPE "TripStatus" AS ENUM ('ASSIGNED', 'AT_PICKUP', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');
CREATE TYPE "RefreshTokenStatus" AS ENUM ('ACTIVE', 'ROTATED', 'REVOKED', 'EXPIRED');
CREATE TYPE "PaymentOrderStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');
CREATE TYPE "FraudSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "UserSessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "WalletLedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "isKycVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "UserSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "refreshTokenHash" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Load" (
    "id" TEXT NOT NULL,
    "shipperUserId" TEXT NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "dropAddress" TEXT NOT NULL,
    "pickupCity" TEXT NOT NULL,
    "dropCity" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "weightTons" DOUBLE PRECISION NOT NULL,
    "quotedPrice" DECIMAL(12,2) NOT NULL,
    "status" "LoadStatus" NOT NULL DEFAULT 'OPEN',
    "scheduledPickupAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "driverUserId" TEXT NOT NULL,
    "currentStatus" "TripStatus" NOT NULL DEFAULT 'ASSIGNED',
    "vehicleNumber" TEXT NOT NULL,
    "etaHours" INTEGER,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripLocationPing" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "accuracyM" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripLocationPing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "accountNumberMasked" TEXT NOT NULL,
    "ifscCode" TEXT NOT NULL,
    "upiId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "RefreshTokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OtpRequest" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedCount" INTEGER NOT NULL DEFAULT 0,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OtpRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "loadId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "amountInPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "receipt" TEXT NOT NULL,
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'CREATED',
    "notesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "paymentOrderId" TEXT,
    "razorpayOrderId" TEXT,
    "eventName" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "WalletLedgerDirection" NOT NULL,
    "amountInPaise" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountInPaise" INTEGER NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppJob" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    CONSTRAINT "AppJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FraudSignal" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "tripId" TEXT,
    "signalType" TEXT NOT NULL,
    "severity" "FraudSeverity" NOT NULL DEFAULT 'LOW',
    "score" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FraudSignal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "UserSession_sessionId_key" ON "UserSession"("sessionId");
CREATE UNIQUE INDEX "Trip_loadId_key" ON "Trip"("loadId");
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE UNIQUE INDEX "OtpRequest_mobile_action_key" ON "OtpRequest"("mobile", "action");
CREATE UNIQUE INDEX "PaymentOrder_razorpayOrderId_key" ON "PaymentOrder"("razorpayOrderId");

CREATE INDEX "User_role_status_idx" ON "User"("role", "status");
CREATE INDEX "UserSession_userId_status_idx" ON "UserSession"("userId", "status");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");
CREATE INDEX "Load_shipperUserId_status_idx" ON "Load"("shipperUserId", "status");
CREATE INDEX "Load_pickupCity_dropCity_status_idx" ON "Load"("pickupCity", "dropCity", "status");
CREATE INDEX "Load_scheduledPickupAt_status_idx" ON "Load"("scheduledPickupAt", "status");
CREATE INDEX "Trip_driverUserId_currentStatus_idx" ON "Trip"("driverUserId", "currentStatus");
CREATE INDEX "Trip_loadId_currentStatus_idx" ON "Trip"("loadId", "currentStatus");
CREATE INDEX "Trip_currentLat_currentLng_idx" ON "Trip"("currentLat", "currentLng");
CREATE INDEX "Trip_updatedAt_currentStatus_idx" ON "Trip"("updatedAt", "currentStatus");
CREATE INDEX "TripLocationPing_tripId_createdAt_idx" ON "TripLocationPing"("tripId", "createdAt");
CREATE INDEX "TripLocationPing_lat_lng_idx" ON "TripLocationPing"("lat", "lng");
CREATE INDEX "BankAccount_userId_isVerified_idx" ON "BankAccount"("userId", "isVerified");
CREATE INDEX "RefreshToken_userId_status_idx" ON "RefreshToken"("userId", "status");
CREATE INDEX "RefreshToken_userId_sessionId_status_idx" ON "RefreshToken"("userId", "sessionId", "status");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
CREATE INDEX "OtpRequest_mobile_blockedUntil_idx" ON "OtpRequest"("mobile", "blockedUntil");
CREATE INDEX "PaymentOrder_createdByUserId_status_idx" ON "PaymentOrder"("createdByUserId", "status");
CREATE INDEX "PaymentOrder_loadId_status_idx" ON "PaymentOrder"("loadId", "status");
CREATE INDEX "PaymentOrder_updatedAt_status_idx" ON "PaymentOrder"("updatedAt", "status");
CREATE INDEX "PaymentWebhookEvent_razorpayOrderId_receivedAt_idx" ON "PaymentWebhookEvent"("razorpayOrderId", "receivedAt");
CREATE INDEX "PaymentWebhookEvent_eventName_receivedAt_idx" ON "PaymentWebhookEvent"("eventName", "receivedAt");
CREATE INDEX "WalletLedger_userId_createdAt_idx" ON "WalletLedger"("userId", "createdAt");
CREATE INDEX "WalletLedger_category_createdAt_idx" ON "WalletLedger"("category", "createdAt");
CREATE INDEX "Settlement_userId_status_idx" ON "Settlement"("userId", "status");
CREATE INDEX "AppJob_status_availableAt_createdAt_idx" ON "AppJob"("status", "availableAt", "createdAt");
CREATE INDEX "AppJob_name_status_idx" ON "AppJob"("name", "status");
CREATE INDEX "FraudSignal_userId_createdAt_idx" ON "FraudSignal"("userId", "createdAt");
CREATE INDEX "FraudSignal_tripId_createdAt_idx" ON "FraudSignal"("tripId", "createdAt");
CREATE INDEX "FraudSignal_severity_score_idx" ON "FraudSignal"("severity", "score");

ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Load" ADD CONSTRAINT "Load_shipperUserId_fkey" FOREIGN KEY ("shipperUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverUserId_fkey" FOREIGN KEY ("driverUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripLocationPing" ADD CONSTRAINT "TripLocationPing_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WalletLedger" ADD CONSTRAINT "WalletLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppJob" ADD CONSTRAINT "AppJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FraudSignal" ADD CONSTRAINT "FraudSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FraudSignal" ADD CONSTRAINT "FraudSignal_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
