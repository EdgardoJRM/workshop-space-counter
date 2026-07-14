-- Run in La Bóveda Supabase SQL Editor.
-- Grants duplica-recursos collection (Glosario + Material de Apoyo) when Hernandez Pass
-- check-in webhook fires for duplica-ventas.

INSERT INTO "WebhookGrantRule" (
  "id",
  "organizationId",
  "provider",
  "productId",
  "targetType",
  "collectionId",
  "active"
)
SELECT
  'wgr_hernandez_pass_duplica_ventas',
  o."id",
  'hernandez-pass',
  'duplica-ventas',
  'COLLECTION',
  c."id",
  true
FROM "Organization" o
CROSS JOIN LATERAL (
  SELECT col."id"
  FROM "Collection" col
  WHERE col."organizationId" = o."id"
    AND (
      col."slug" = 'duplica-recursos'
      OR (
        SELECT COUNT(DISTINCT b."title")
        FROM "CollectionBook" cb
        JOIN "Book" b ON b."id" = cb."bookId"
        WHERE cb."collectionId" = col."id"
          AND b."title" IN (
            'Glosario de Palabras',
            'Material de Apoyo — Duplica'
          )
      ) = 2
    )
  ORDER BY
    CASE WHEN col."slug" = 'duplica-recursos' THEN 0 ELSE 1 END,
    col."createdAt" ASC
  LIMIT 1
) c
WHERE o."slug" = 'edgardo'
ON CONFLICT ("organizationId", "provider", "productId")
DO UPDATE SET
  "targetType" = 'COLLECTION',
  "collectionId" = EXCLUDED."collectionId",
  "bookId" = NULL,
  "active" = true;

-- Verify
SELECT
  r."id",
  r."provider",
  r."productId",
  r."targetType",
  c."slug" AS "collectionSlug",
  c."name" AS "collectionName",
  r."active"
FROM "WebhookGrantRule" r
LEFT JOIN "Collection" c ON c."id" = r."collectionId"
WHERE r."provider" = 'hernandez-pass'
  AND r."productId" = 'duplica-ventas';
