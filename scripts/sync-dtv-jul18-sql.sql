-- DTV Jul 18 2026 — sync helpers (run in Supabase SQL Editor or psql)
-- Timezone: America/Puerto_Rico

-- 1) Find workshop date id
SELECT wd.id, wd.title, wd."startsAt",
       (wd."startsAt" AT TIME ZONE 'America/Puerto_Rico')::date AS calendar_day
FROM "WorkshopDate" wd
JOIN "Workshop" w ON w.id = wd."workshopId"
WHERE w.slug = 'duplica-ventas'
  AND (wd."startsAt" AT TIME ZONE 'America/Puerto_Rico')::date = DATE '2026-07-18';

-- 2) CONFIRMED regs for that date, with check-in flag
-- Replace :workshop_date_id before running
/*
SELECT r.id, lower(trim(coalesce(r."attendeeEmail", a.email))) AS email,
       r."attendeeName", r."createdAt",
       EXISTS (SELECT 1 FROM "Checkin" c WHERE c."registrationId" = r.id) AS has_checkin,
       p."tokenHash" IS NOT NULL AS has_pass
FROM "Registration" r
JOIN "Attendee" a ON a.id = r."attendeeId"
LEFT JOIN "Pass" p ON p."registrationId" = r.id
WHERE r."workshopDateId" = ':workshop_date_id'
  AND r.status = 'CONFIRMED'
ORDER BY email, r."createdAt";
*/

-- 3) Duplicate emails (count > 1)
/*
WITH regs AS (
  SELECT r.id,
         lower(trim(coalesce(r."attendeeEmail", a.email))) AS email,
         r."createdAt",
         EXISTS (SELECT 1 FROM "Checkin" c WHERE c."registrationId" = r.id) AS has_checkin
  FROM "Registration" r
  JOIN "Attendee" a ON a.id = r."attendeeId"
  WHERE r."workshopDateId" = ':workshop_date_id'
    AND r.status = 'CONFIRMED'
),
ranked AS (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY email
           ORDER BY has_checkin DESC, "createdAt" ASC
         ) AS rn
  FROM regs
)
SELECT * FROM ranked WHERE rn > 1 ORDER BY email, "createdAt";
*/

-- 4) Delete duplicate extras (keeper = rn 1). CASCADE removes Pass/Checkin/PrintJob.
/*
WITH regs AS (
  SELECT r.id,
         lower(trim(coalesce(r."attendeeEmail", a.email))) AS email,
         r."createdAt",
         EXISTS (SELECT 1 FROM "Checkin" c WHERE c."registrationId" = r.id) AS has_checkin
  FROM "Registration" r
  JOIN "Attendee" a ON a.id = r."attendeeId"
  WHERE r."workshopDateId" = ':workshop_date_id'
    AND r.status = 'CONFIRMED'
),
to_delete AS (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY email
             ORDER BY has_checkin DESC, "createdAt" ASC
           ) AS rn
    FROM regs
  ) x WHERE rn > 1
)
DELETE FROM "Registration" WHERE id IN (SELECT id FROM to_delete)
RETURNING id, "attendeeEmail";
*/
