-- Run in Supabase SQL Editor if label template save fails (missing table/index).

CREATE TABLE IF NOT EXISTS "LabelTemplate" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workshopSlug" TEXT,
  "fontLarge" INTEGER NOT NULL DEFAULT 160,
  "fontSmall" INTEGER NOT NULL DEFAULT 80,
  "mediaSize" TEXT NOT NULL DEFAULT '3x2',
  "showEmail" BOOLEAN NOT NULL DEFAULT false,
  "showWorkshop" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabelTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LabelTemplate_organizationId_workshopSlug_key"
  ON "LabelTemplate"("organizationId", "workshopSlug");

CREATE INDEX IF NOT EXISTS "LabelTemplate_organizationId_idx"
  ON "LabelTemplate"("organizationId");

DO $$ BEGIN
  ALTER TABLE "LabelTemplate"
    ADD CONSTRAINT "LabelTemplate_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
