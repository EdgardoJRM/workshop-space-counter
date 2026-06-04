# Hernandez Pass — Guía de operación

## Qué se conservó del contador original

- `GET /api/spaces?w=<slug>` — mismo JSON (`available`, `updatedAt`) para widgets en ClickFunnels.
- `POST /api/admin/spaces` — mismo body (`available`, `token`, `workshop`).
- Panel `/admin` — pestañas por taller + formulario de cupos.
- Redis/Upstash — sincronizado automáticamente desde la fecha activa en Postgres.

## Variables de entorno

Copia `.env.local.example` a `.env.local` y completa:

| Variable | Uso |
|----------|-----|
| `POSTGRES_PRISMA_URL` | Auto con integración Vercel↔Supabase (pooler, Prisma) |
| `POSTGRES_URL_NON_POOLING` | Auto — conexión directa para migraciones |
| `UPSTASH_REDIS_*` | Contador público (existente) |
| `ADMIN_TOKEN` | Admin cupos + APIs admin |
| `APP_BASE_URL` | URL pública para QR y emails |
| `CLICKFUNNELS_WEBHOOK_SECRET` | Validación del webhook |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `EMAIL_FROM` | Email del pase vía **Amazon SES** |
| `ADMIN_EMAILS`, `STAFF_EMAILS`, `AUTH_JWT_SECRET` | Magic link en `/login` (admin y staff) |
| `APP_BASE_URL` | Obligatorio para enlaces mágicos en el email |

## Primer despliegue

```bash
npm install
cp .env.local.example .env.local
# Editar .env.local

npm run db:push
npm run db:seed
npm run dev
```

En Vercel: añade las mismas variables y ejecuta `db push` + `seed` contra tu Postgres de producción (una vez).

### Supabase + Vercel (conexión automática)

Si ya enlazaste Supabase en **Vercel → Integrations**, Vercel añade solo:

- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- (y otras `SUPABASE_*` — no las usa esta app)

**Pasos siguientes:**

1. **Redeploy** el proyecto en Vercel (para que cargue las variables nuevas).
2. En tu Mac, trae las variables a local (elige una):
   - Vercel Dashboard → Settings → Environment Variables → copiar las dos URLs a `.env.local`, o
   - `npx vercel env pull .env.local` (si tienes Vercel CLI enlazado).
3. Crear tablas (una vez):
   ```bash
   npm run db:push
   npm run db:seed
   ```
4. En **Supabase → Table Editor** verifica tablas `Workshop`, `Registration`, etc.

**Si Prisma falla en producción** con `prepared statement already exists`, edita en Vercel `POSTGRES_PRISMA_URL` y asegura que termine con `?pgbouncer=true` (y en serverless a veces `&connection_limit=1`).

**Integración Vercel↔Supabase con URLs vacías:** es normal. Vercel sí pasa `POSTGRES_HOST`, `SUPABASE_URL`, etc.; a menudo **no** pasa la contraseña ni las URLs completas.

Solo necesitas **una** variable secreta en Vercel (y local para `db:setup`):

1. Supabase → **Settings** → **Database** → contraseña (o **Reset database password**).
2. Vercel → **Environment Variables** → `POSTGRES_PASSWORD` = esa contraseña (Production, Preview, Development).
3. En tu Mac (no uses `vercel env pull .env.local` a secas — baja **Development** y muchas vienen vacías):
   ```bash
   npm run env:sync
   ```
   Eso baja **Production** y fusiona en `.env.local`. Si `POSTGRES_PASSWORD` sigue vacío, la integración no la rellenó: ponla **una vez** en Vercel y vuelve a `npm run env:sync`.
4. Crear tablas:
   ```bash
   npm run db:setup
   ```
   El script arma `POSTGRES_PRISMA_URL` y `POSTGRES_URL_NON_POOLING` automáticamente.

No hace falta copiar las URLs largas de Supabase. Si el pooler no es `us-east-1`, añade `SUPABASE_DB_REGION` en Vercel.

`vercel env pull .env.local` sin `--environment=production` solo baja **Development** (casi sin Supabase).

**Nota:** Solo usamos Postgres de Supabase, no Supabase Auth.

### Amazon SES (emails)

1. En [AWS SES](https://console.aws.amazon.com/ses/), verifica el **dominio** o el **email** que usarás en `EMAIL_FROM`.
2. Si la cuenta está en **sandbox**, solo puedes enviar a correos verificados; solicita salida a producción cuando vayas en vivo.
3. Crea un usuario IAM con permiso `ses:SendEmail` (o adjunta la política `AmazonSESFullAccess` restringida a tu identidad).
4. Variables: `AWS_REGION` (ej. `us-east-1`), claves IAM, y `EMAIL_FROM` con formato `Nombre <email@dominio-verificado.com>`.

**Verificar por CLI / script:**

```bash
# Con perfil AWS CLI (~/.aws) o variables AWS_* en .env.local
npm run verify:ses

# Envío de prueba (opcional)
EMAIL_FROM='Hernandez Pass <soporte@edgardohernandez.com>' npm run verify:ses:send
```

También: `aws ses get-send-quota --region us-east-1` y `aws sesv2 list-email-identities --region us-east-1`.

## ClickFunnels — webhook

**URL:** `POST https://<tu-dominio>/api/webhooks/clickfunnels`

**Autenticación (elige una):**

- Header: `X-Webhook-Secret: <CLICKFUNNELS_WEBHOOK_SECRET>`
- O query: `?secret=<CLICKFUNNELS_WEBHOOK_SECRET>`

**Campos mínimos en el JSON:** `email` (requerido), `id` u `order_id` (idempotencia).

**Campos opcionales:**

- `workshop` / `workshop_slug` — `duplica-ventas`, `canva`, `oferta-webinar`
- `workshop_date_id` — ID de fecha en admin (si no se envía, usa la fecha **activa** del taller)

**Ejemplo de prueba:**

```bash
curl -sS -X POST "https://<dominio>/api/webhooks/clickfunnels" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: TU_SECRETO" \
  -d '{
    "id": "test-order-001",
    "email": "asistente@ejemplo.com",
    "first_name": "María",
    "last_name": "García",
    "workshop": "duplica-ventas"
  }'
```

Respuesta exitosa: `{ "ok": true, "registrationId": "...", "passUrl": "..." }`

## Acceso admin y staff (magic link)

1. Abre `/login` (o `/login?intent=staff` / `?intent=admin`).
2. Introduce un correo listado en `ADMIN_EMAILS` o `STAFF_EMAILS`.
3. Recibes un enlace por SES (válido 15 min); al hacer clic quedas con sesión 7 días.

## Flujo del día del evento

1. Staff abre `/login?intent=staff` → magic link → `/staff/scan`.
2. Escanea el QR del email o del pase (`/pass/<token>`).
3. API `POST /api/checkins/scan` marca check-in (duplicados = “ya registrado”).

## Admin (`/admin`)

Panel con menú lateral **Centro de configuración**:

| Sección | Qué configuras |
|---------|----------------|
| **Inicio** | Resumen: webhook OK, plantillas de email, fecha activa por taller |
| **Cupos** | Contador público (Redis) por taller |
| **Fechas** | Crear/editar/activar fecha del evento (usa el webhook y el contador) |
| **Registros** | Asistentes y reenvío de pase |
| **Webhook** | URL y header para ClickFunnels |
| **Emails** | Plantillas post-evento (delay en horas + cron diario en Vercel Hobby) |

Variables que **siguen solo en Vercel** (no hay UI): `CLICKFUNNELS_WEBHOOK_SECRET`, `CRON_SECRET`, claves AWS/SES, `ADMIN_EMAILS`, etc. El panel confirma si el webhook secret está configurado, pero no muestra su valor.

## Fechas de taller

Cada taller tiene una fecha **activa** (`isActive: true`) usada por el webhook y el contador.

Tras `db:seed` hay una fecha por taller. Para nuevas fechas, usa `POST /api/admin/dates` (ver implementación en `app/api/admin/dates/route.ts`) o Prisma Studio.

## Smoke test local

1. `npm run dev`
2. Webhook de prueba (con DB y secret configurados).
3. Abrir `passUrl` del response.
4. Login staff → escanear QR o pegar URL en campo manual.

## Fase 2 (fuera del MVP)

- Perfiles de asistente con historial.
- Hernandez Shelves (biblioteca protegida).
- Secuencias de email post-evento configurables en admin.
