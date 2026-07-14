-- Run in Supabase SQL Editor to add isSelling for "fecha en venta" routing.

ALTER TABLE "WorkshopDate" ADD COLUMN IF NOT EXISTS "isSelling" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "WorkshopDate_workshopId_isSelling_idx"
  ON "WorkshopDate"("workshopId", "isSelling");

-- Bootstrap: mark one active date per workshop as selling (soonest upcoming active).
UPDATE "WorkshopDate" SET "isSelling" = false WHERE "isSelling" = true;

UPDATE "WorkshopDate" d
SET "isSelling" = true
FROM (
  SELECT DISTINCT ON (wd."workshopId") wd.id
  FROM "WorkshopDate" wd
  WHERE wd."isActive" = true
  ORDER BY wd."workshopId", wd."startsAt" ASC
) pick
WHERE d.id = pick.id;
