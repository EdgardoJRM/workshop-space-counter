# Hernandez Pass — Guía de operación

## Qué se conservó del contador original

- `GET /api/spaces?w=<slug>` — mismo JSON (`available`, `updatedAt`) para widgets en ClickFunnels.
- `POST /api/admin/spaces` — mismo body (`available`, `token`, `workshop`).
- Panel `/admin` — pestañas por taller + formulario de cupos.
- Redis/Upstash — sincronizado desde la fecha **en venta** del taller en Postgres.

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
| `GOOGLE_MAPS_API_KEY` | Opcional: imagen del mapa en el email del pase |
| `PRINT_AGENT_TOKEN` | Secreto compartido con la Mac (Impresora Auto) para cola de labels |

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

Ver sección Supabase + Vercel en versiones anteriores de este doc si necesitas `npm run env:sync` / `db:setup`.

## Fechas: en venta vs evento de hoy

| Flag | Significado | Quién lo usa |
|------|-------------|--------------|
| **En venta** (`isSelling`) | A qué fecha van las **compras** del webhook y el contador ClickFunnels | Webhook, cupos Redis |
| **Evento de hoy** (`isActive`) | Qué fecha usa el equipo para **escanear** ese día | Staff scanner, app móvil |

Regla: **una fecha en venta por taller** antes de abrir ventas. El día del evento, marca **evento de hoy** (puede ser la misma fecha u otra).

## ClickFunnels — webhook

**Recomendado: una URL por taller** (mismo secreto de la organización):

```
POST https://<tu-dominio>/api/webhooks/clickfunnels?org=hernandez&workshop=duplica-ventas
POST https://<tu-dominio>/api/webhooks/clickfunnels?org=hernandez&workshop=canva
POST https://<tu-dominio>/api/webhooks/clickfunnels?org=hernandez&workshop=oferta-webinar
```

El parámetro `?workshop=` (o `?w=`) **gana** sobre cualquier taller en el JSON. El flujo **AT&T / Duplica** debe usar la URL de `duplica-ventas`.

**URL genérica** (sin `workshop=`): solo si el funnel envía token `vcanva` / `vdtv` o campo `workshop`. Si no, la compra queda en **Compras sin asignar**.

**Autenticación:**

- **ClickFunnels V2:** `X-Webhook-ClickFunnels-Signature` + timestamp, HMAC con el webhook secret del endpoint.
- **Pruebas manuales:** header `X-Webhook-Secret` o query `?secret=`.

**Campos mínimos:** `email`, `id` u `order_id`.

**Multi-boleto:** `line_items` con cantidad; si `ticketQuantity > 1`, se pide datos del invitado por email.

**Ejemplo curl (Duplica):**

```bash
curl -sS -X POST "https://<dominio>/api/webhooks/clickfunnels?org=hernandez&workshop=duplica-ventas" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: TU_SECRETO" \
  -d '{
    "id": "test-order-001",
    "email": "asistente@ejemplo.com",
    "first_name": "María",
    "last_name": "García"
  }'
```

Respuesta exitosa: `{ "ok": true, "registrationId": "...", "passUrl": "..." }`

Configura URLs y secreto en Admin → **Webhook**. Revisa **Compras sin asignar** e **Invitados pendientes** cada mañana de ventas.

Guía de cableado CF: [`docs/CLICKFUNNELS_SETUP.md`](CLICKFUNNELS_SETUP.md).  
Checklist imprimible: [`docs/EVENT_DAY_CHECKLIST.md`](EVENT_DAY_CHECKLIST.md).

## Acceso admin y staff (magic link)

1. Abre `/login` (o `?intent=staff` / `?intent=admin`).
2. Correo en `ADMIN_EMAILS` o `STAFF_EMAILS`.
3. Enlace por SES (15 min); sesión 30 días.

## Flujo del día del evento (checklist)

1. **Antes:** una fecha **en venta** por taller; webhooks cableados en CF (URL con `?workshop=`).
2. **Mañana del evento:** marca **evento de hoy** en Admin → Fechas (por taller).
3. **Mac del evento:** Rollo = impresora predeterminada; Chrome con **estación web** (`/staff/print-station`) armada.
4. **Staff:** app móvil o `/staff/scan` → elige **evento** (taller incluido en el nombre) → escanea QR.
5. **1 scan = 1 label** (rescan = ya registrado, sin reimpresión automática). Si falla: botón **Reimprimir** (no duplica si ya hay job pendiente).
6. **Duplica Ventas:** check-in dispara webhook a La Bóveda (no bloquea el scan si falla).
7. Revisa **Compras sin asignar** e **Invitados pendientes**.

## Admin (`/admin`)

| Sección | Qué configuras |
|---------|----------------|
| **Inicio** | Resumen: webhook, emails, en venta / evento de hoy por taller |
| **Cupos** | Contador público (Redis) por taller |
| **Fechas** | Crear fechas; **en venta** (webhook) y **evento de hoy** (check-in) |
| **Personas** | Lista **por fecha** (elige fecha del evento), CSV, alta manual, reenvío de pase, reimprimir label |
| **Compras sin asignar** | Asignar taller a compras CF sin URL fija |
| **Invitados pendientes** | Boletos extra sin datos del invitado |
| **Webhook** | Tres URLs por taller + secreto |
| **Impresora** | Estación web Chrome + emparejamiento legacy (agente) |
| **Emails** | Plantillas post-evento |

Variables solo en Vercel: `CLICKFUNNELS_WEBHOOK_SECRET`, `CRON_SECRET`, AWS/SES, listas de correo.

## App móvil (staff)

La app es **solo para el día del evento** (scanner + lista + impresora). Toda la configuración (cupos, fechas, webhook, personas, CSV) es en **pass.edgardohernandez.com/admin**.

1. Pestaña **Evento** → elige la **fecha** del día (muestra taller + hora).
2. **Escanear** / **Lista** usan **solo esa fecha** — cada registro pertenece a una fecha, no a un listado general del taller.
3. **Impresora** → estado y emparejamiento mínimo con la Mac.
4. Sin pestaña Admin en la app; si no hay eventos, configura fechas en la web.

## Labels Rollo

### Estación web (recomendado)

1. Rollo instalada en macOS como impresora predeterminada (3×2″).
2. Abre Chrome con impresión silenciosa:
   ```bash
   open -na "Google Chrome" --args --kiosk-printing --new-window https://pass.edgardohernandez.com/staff/print-station
   ```
3. Login staff → deja la pestaña **Armada**.

**Regla crítica:** solo **un** consumidor de la cola de print por evento — estación Chrome **o** Impresora Auto (Mac), **nunca ambos**. Si ambos están activos, los labels se pierden o se duplican.

4. Check-in encola label → la estación imprime sola.
5. Admin → **Labels**: personaliza fuentes/campos; aplica al siguiente job en cola.

### Agente legacy (fallback)

1. `PRINT_AGENT_TOKEN` en Vercel y en la Mac.
2. Instalar **Impresora Auto** ([`impresora-auto/README.md`](../impresora-auto/README.md)).
3. Usar solo si la estación web falla.

Admin → Labels: fuentes y papel. Personas (por fecha) → Reimprimir si hace falta.

SQL alternativo: [`docs/PRINT_QUEUE_SQL.md`](PRINT_QUEUE_SQL.md).

## Smoke test local

1. `npm run dev`
2. Webhook de prueba con `?workshop=duplica-ventas` y fecha **en venta** configurada.
3. Abrir `passUrl` del response.
4. Login staff → escanear QR.

## Amazon SES

Verifica dominio/email en AWS SES, IAM con `ses:SendEmail`, variables `AWS_*` y `EMAIL_FROM`. Sandbox: solo correos verificados hasta producción.

```bash
npm run verify:ses
```
