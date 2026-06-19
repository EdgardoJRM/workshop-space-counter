-- Elimina registros duplicados (mismo email + fecha de taller).
-- Conserva: con check-in > con guest-info > más antiguo.
-- Ejecutar en Supabase → SQL Editor.

-- 1) Vista previa
WITH ranked AS (
  SELECT
    r.id,
    r."workshopDateId",
    LOWER(COALESCE(r."attendeeEmail", a.email)) AS email,
    r."attendeeName",
    r."registeredAt",
    r."externalOrderId",
    r.source,
    ROW_NUMBER() OVER (
      PARTITION BY r."workshopDateId", LOWER(COALESCE(r."attendeeEmail", a.email))
      ORDER BY
        CASE
          WHEN EXISTS (
            SELECT 1 FROM "Checkin" c WHERE c."registrationId" = r.id
          ) THEN 0
          ELSE 1
        END,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM "GuestInfoRequest" g
            WHERE g."buyerRegistrationId" = r.id
          ) THEN 0
          ELSE 1
        END,
        r."registeredAt" ASC
    ) AS rn
  FROM "Registration" r
  INNER JOIN "Attendee" a ON a.id = r."attendeeId"
  WHERE r.status = 'CONFIRMED'
)
SELECT *
FROM ranked
WHERE rn > 1
ORDER BY email, "registeredAt";

-- 2) Borrar duplicados (quita LIMIT 3 para borrar todos)
WITH ranked AS (
  SELECT
    r.id,
    r."workshopDateId",
    ROW_NUMBER() OVER (
      PARTITION BY r."workshopDateId", LOWER(COALESCE(r."attendeeEmail", a.email))
      ORDER BY
        CASE
          WHEN EXISTS (
            SELECT 1 FROM "Checkin" c WHERE c."registrationId" = r.id
          ) THEN 0
          ELSE 1
        END,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM "GuestInfoRequest" g
            WHERE g."buyerRegistrationId" = r.id
          ) THEN 0
          ELSE 1
        END,
        r."registeredAt" ASC
    ) AS rn
  FROM "Registration" r
  INNER JOIN "Attendee" a ON a.id = r."attendeeId"
  WHERE r.status = 'CONFIRMED'
),
to_delete AS (
  SELECT id, "workshopDateId"
  FROM ranked
  WHERE rn > 1
  ORDER BY "workshopDateId", id
  LIMIT 3
),
deleted AS (
  DELETE FROM "Registration" r
  USING to_delete d
  WHERE r.id = d.id
  RETURNING r."workshopDateId"
)
UPDATE "WorkshopDate" wd
SET "soldCount" = (
  SELECT COUNT(*)::int
  FROM "Registration" r
  WHERE r."workshopDateId" = wd.id
    AND r.status = 'CONFIRMED'
)
WHERE wd.id IN (SELECT DISTINCT "workshopDateId" FROM deleted);
