# ClickFunnels Lead CRM

Aplicación independiente **Next.js + TypeScript + Tailwind CSS + Supabase** para manejar leads recibidos desde ClickFunnels.

## Rutas

| Ruta | Uso |
|------|-----|
| `/login` | Login privado con Supabase Auth |
| `/dashboard` | Dashboard CRM protegido |
| `/dashboard/leads/[id]` | Detalle, edición, notas e historial |
| `POST /api/leads` | Webhook externo para crear leads desde ClickFunnels |

## Variables de entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Completa:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CLICKFUNNELS_WEBHOOK_SECRET=
```

## Base de datos Supabase

1. Crea un proyecto en Supabase.
2. En **SQL Editor**, ejecuta `supabase/leads.sql`.
3. En **Authentication > Users**, crea los usuarios que pueden entrar al CRM.

La tabla `leads` incluye:

- `id uuid primary key`
- `name text`
- `email text`
- `phone text`
- `status text default 'Nuevo'`
- `form_data jsonb`
- `notes jsonb`
- `created_at timestamp`
- `updated_at timestamp`

## Conectar ClickFunnels

Configura el webhook de ClickFunnels apuntando a:

```text
https://<tu-dominio>/api/leads
```

Usa método `POST`, body JSON y este header:

```text
x-api-key: <CLICKFUNNELS_WEBHOOK_SECRET>
```

Payload recomendado:

```json
{
  "name": "Nombre del lead",
  "email": "correo@email.com",
  "phone": "7870000000",
  "form_data": {
    "pregunta_1": "respuesta",
    "pregunta_2": "respuesta"
  }
}
```

El endpoint valida el secreto, requiere que llegue `name`, `email` o `phone`, guarda el lead con estado inicial `Nuevo`, conserva respuestas extra en `form_data` y retorna:

```json
{ "success": true }
```

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Deploy

Puedes desplegar esta carpeta como proyecto independiente en Vercel. Si está dentro de un monorepo, configura el **Root Directory** como:

```text
clickfunnels-lead-crm
```
