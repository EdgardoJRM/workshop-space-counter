-- Run in Supabase SQL Editor if email template save fails (missing anchor column).

ALTER TABLE "EmailTemplate"
  ADD COLUMN IF NOT EXISTS "anchor" TEXT NOT NULL DEFAULT 'event_start';
