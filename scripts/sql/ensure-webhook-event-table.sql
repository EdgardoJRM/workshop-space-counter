-- Run in Supabase SQL Editor if POST /api/webhooks/clickfunnels returns 500.
-- Fixes WebhookEvent table + SaaS indexes (Attendee, Workshop, etc.).

DO $$ BEGIN
  CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'DUPLICATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'clickfunnels',
  "externalId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WebhookEvent" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_organizationId_provider_externalId_key"
  ON "WebhookEvent"("organizationId", "provider", "externalId");

CREATE INDEX IF NOT EXISTS "WebhookEvent_organizationId_status_idx"
  ON "WebhookEvent"("organizationId", "status");

DO $$ BEGIN
  ALTER TABLE "WebhookEvent"
    ADD CONSTRAINT "WebhookEvent_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Attendee: compound unique (fixes prisma.attendee.upsert 42P10)
ALTER TABLE "Attendee" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Attendee_organizationId_email_key"
  ON "Attendee"("organizationId", "email");

CREATE INDEX IF NOT EXISTS "Attendee_organizationId_idx"
  ON "Attendee"("organizationId");

-- Workshop per-tenant slug
ALTER TABLE "Workshop" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Workshop_organizationId_slug_key"
  ON "Workshop"("organizationId", "slug");
