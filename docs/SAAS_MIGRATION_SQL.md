# Migración SaaS multi-tenant

Ejecuta en **Supabase SQL Editor** si no puedes `npm run db:push`.

---

## Si ya tienes `Organization` (error displayName / column does not exist)

**Ejecuta esto primero** (solo columnas de branding + org Hernandez):

```sql
-- 1) Columnas white-label en Organization
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "appTitle" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "accentColor" TEXT DEFAULT '#c9a227';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "supportEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "customDomain" TEXT;

-- 2) Crear o actualizar org Hernandez
INSERT INTO "Organization" (
  "id", "slug", "name", "displayName", "appTitle",
  "plan", "primaryColor", "accentColor", "updatedAt"
)
VALUES (
  'org_hernandez_default', 'hernandez', 'Hernandez Media', 'Hernandez Media', 'Hernandez Pass',
  'BUSINESS', '#1a1a1a', '#c9a227', NOW()
)
ON CONFLICT ("slug") DO UPDATE SET
  "displayName" = EXCLUDED."displayName",
  "appTitle" = EXCLUDED."appTitle",
  "primaryColor" = EXCLUDED."primaryColor",
  "accentColor" = EXCLUDED."accentColor",
  "updatedAt" = NOW();

-- 3) organizationId en tablas existentes (si faltan)
ALTER TABLE "Workshop" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Attendee" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "LabelTemplate" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "WebhookEvent" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "PrintJob" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

UPDATE "Workshop" SET "organizationId" = 'org_hernandez_default' WHERE "organizationId" IS NULL;
UPDATE "Attendee" SET "organizationId" = 'org_hernandez_default' WHERE "organizationId" IS NULL;
UPDATE "EmailTemplate" SET "organizationId" = 'org_hernandez_default' WHERE "organizationId" IS NULL;
UPDATE "LabelTemplate" SET "organizationId" = 'org_hernandez_default' WHERE "organizationId" IS NULL;
UPDATE "WebhookEvent" SET "organizationId" = 'org_hernandez_default' WHERE "organizationId" IS NULL;

UPDATE "PrintJob" pj SET "organizationId" = 'org_hernandez_default'
FROM "Registration" r
WHERE pj."registrationId" = r.id AND pj."organizationId" IS NULL;
```

Luego añade tu email como miembro (cambia el correo):

```sql
INSERT INTO "OrganizationMember" ("id", "organizationId", "email", "role", "updatedAt")
VALUES ('mem_owner_1', 'org_hernandez_default', 'TU_EMAIL@ejemplo.com', 'OWNER', NOW())
ON CONFLICT ("organizationId", "email") DO UPDATE SET "role" = 'OWNER', "updatedAt" = NOW();
```

---

## Instalación desde cero (tablas nuevas)

### 1. Enums y tablas nuevas

Omite cualquier `CREATE` que falle porque la tabla ya existe.

```sql
DO $$ BEGIN
  CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PlanTier" AS ENUM ('STARTER', 'EVENT_PRO', 'BUSINESS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Organization" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "displayName" TEXT,
  "appTitle" TEXT,
  "logoUrl" TEXT,
  "primaryColor" TEXT DEFAULT '#1a1a1a',
  "accentColor" TEXT DEFAULT '#c9a227',
  "supportEmail" TEXT,
  "customDomain" TEXT,
  "plan" "PlanTier" NOT NULL DEFAULT 'STARTER',
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "subscriptionStatus" TEXT,
  "clickfunnelsSecret" TEXT,
  "legacyPrintAgentToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");

-- OrganizationMember, PrinterAgent, PrinterPairingCode: ver migración anterior en repo o npm run db:push
```

### 2. Preferido en local

```bash
npm run db:push
npm run db:seed
```

Esto aplica el schema de Prisma completo sin errores de orden manual.

---

## Verificación (después de migrar)

En Supabase SQL Editor:

```sql
-- Org Hernandez con branding
SELECT id, slug, name, "displayName", "appTitle", plan
FROM "Organization" WHERE slug = 'hernandez';

-- Tu acceso como staff
SELECT email, role FROM "OrganizationMember"
WHERE "organizationId" = 'org_hernandez_default';

-- Datos ligados al tenant
SELECT
  (SELECT COUNT(*) FROM "Workshop" WHERE "organizationId" = 'org_hernandez_default') AS workshops,
  (SELECT COUNT(*) FROM "Attendee" WHERE "organizationId" = 'org_hernandez_default') AS attendees;

-- Tablas de impresora (necesarias para emparejar Mac)
SELECT to_regclass('public."PrinterAgent"') AS printer_agent,
       to_regclass('public."PrinterPairingCode"') AS pairing_code;
```

Si `printer_agent` o `pairing_code` salen `NULL`, crea las tablas con `npm run db:push` (con `POSTGRES_URL_NON_POOLING` apuntando al host directo de Supabase) o pide el bloque completo en el repo vía Prisma.

---

## 3. Índices únicos por organización

Después de migrar, usa `npm run db:push` o ajusta:

- `Workshop`: unique `(organizationId, slug)`
- `Attendee`: unique `(organizationId, email)`
- `LabelTemplate`: unique `(organizationId, workshopSlug)`
- `WebhookEvent`: unique `(organizationId, provider, externalId)`

---

## Qué sigue (operación)

1. **Redeploy** en Vercel (código SaaS + mobile API en producción).
2. **Login web**: `/login` con el mismo email que pusiste en `OrganizationMember`.
3. **Impresora Mac del evento**: Admin → Impresora → código → en la Mac del evento `zsh emparejar.sh` → `zsh instalar.sh` (solo esa Mac con el agente encendido).
4. **Webhook**: `POST .../api/webhooks/clickfunnels?org=hernandez` con el secreto del org.
5. **App iOS** (opcional): ver [`MOBILE_APP.md`](MOBILE_APP.md).
