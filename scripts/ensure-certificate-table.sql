-- Run in Supabase SQL Editor if certificate save/email fails (missing table).

CREATE TABLE IF NOT EXISTS "Certificate" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "emailedAt" TIMESTAMP(3),
  "emailError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_registrationId_key"
  ON "Certificate"("registrationId");

CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_tokenHash_key"
  ON "Certificate"("tokenHash");

CREATE INDEX IF NOT EXISTS "Certificate_registrationId_idx"
  ON "Certificate"("registrationId");

DO $$ BEGIN
  ALTER TABLE "Certificate"
    ADD CONSTRAINT "Certificate_registrationId_fkey"
    FOREIGN KEY ("registrationId") REFERENCES "Registration"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
