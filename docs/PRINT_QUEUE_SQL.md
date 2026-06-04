# Cola de impresión (Supabase SQL Editor)

Ejecuta si `db:push` no está disponible:

```sql
CREATE TYPE "PrintJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'PRINTED', 'FAILED');

CREATE TABLE IF NOT EXISTS "LabelTemplate" (
  "id" TEXT NOT NULL,
  "workshopSlug" TEXT,
  "fontLarge" INTEGER NOT NULL DEFAULT 160,
  "fontSmall" INTEGER NOT NULL DEFAULT 80,
  "mediaSize" TEXT NOT NULL DEFAULT '3x2',
  "showEmail" BOOLEAN NOT NULL DEFAULT false,
  "showWorkshop" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabelTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LabelTemplate_workshopSlug_key" ON "LabelTemplate"("workshopSlug");

CREATE TABLE IF NOT EXISTS "PrintJob" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "checkinId" TEXT,
  "status" "PrintJobStatus" NOT NULL DEFAULT 'PENDING',
  "trigger" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "printedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PrintJob_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PrintJob_checkinId_fkey" FOREIGN KEY ("checkinId") REFERENCES "Checkin"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PrintJob_checkinId_key" ON "PrintJob"("checkinId");
CREATE INDEX IF NOT EXISTS "PrintJob_status_createdAt_idx" ON "PrintJob"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PrintJob_registrationId_idx" ON "PrintJob"("registrationId");
```

Variables en Vercel:

- `PRINT_AGENT_TOKEN` — secreto compartido con la Mac (Impresora Auto).
