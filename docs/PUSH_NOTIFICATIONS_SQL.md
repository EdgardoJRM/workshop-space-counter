# Push notifications — SQL migration

Ejecutar en Supabase si no usas `prisma db push`:

```sql
CREATE TABLE IF NOT EXISTS "MobilePushToken" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "expoPushToken" TEXT NOT NULL,
  "platform" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MobilePushToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MobilePushToken_expoPushToken_key"
  ON "MobilePushToken"("expoPushToken");

CREATE INDEX IF NOT EXISTS "MobilePushToken_organizationId_email_idx"
  ON "MobilePushToken"("organizationId", "email");

ALTER TABLE "MobilePushToken"
  ADD CONSTRAINT "MobilePushToken_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

La app registra el token en `POST /api/mobile/push/register` tras el login.
