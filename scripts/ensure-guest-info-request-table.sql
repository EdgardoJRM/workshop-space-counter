-- Run in Supabase SQL Editor if GuestInfoRequest table is missing in production.

DO $$ BEGIN
  CREATE TYPE "GuestInfoRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "GuestInfoRequest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "buyerRegistrationId" TEXT NOT NULL,
  "externalOrderId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "slotsNeeded" INTEGER NOT NULL,
  "slotsCompleted" INTEGER NOT NULL DEFAULT 0,
  "status" "GuestInfoRequestStatus" NOT NULL DEFAULT 'PENDING',
  "workshopSlug" TEXT NOT NULL,
  "workshopDateId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuestInfoRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GuestInfoRequest_buyerRegistrationId_key"
  ON "GuestInfoRequest"("buyerRegistrationId");

CREATE UNIQUE INDEX IF NOT EXISTS "GuestInfoRequest_tokenHash_key"
  ON "GuestInfoRequest"("tokenHash");

CREATE UNIQUE INDEX IF NOT EXISTS "GuestInfoRequest_organizationId_externalOrderId_key"
  ON "GuestInfoRequest"("organizationId", "externalOrderId");

CREATE INDEX IF NOT EXISTS "GuestInfoRequest_organizationId_status_idx"
  ON "GuestInfoRequest"("organizationId", "status");

DO $$ BEGIN
  ALTER TABLE "GuestInfoRequest"
    ADD CONSTRAINT "GuestInfoRequest_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GuestInfoRequest"
    ADD CONSTRAINT "GuestInfoRequest_buyerRegistrationId_fkey"
    FOREIGN KEY ("buyerRegistrationId") REFERENCES "Registration"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
