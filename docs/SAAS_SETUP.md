# Hernandez Pass SaaS — configuración

## Arquitectura

- **Una plataforma** en Vercel (multi-tenant por `Organization`).
- Cada negocio: slug propio, staff, eventos, cola de impresión.
- **App staff**: PWA o iOS (Capacitor).
- **Mac del evento**: agente con código de emparejamiento (no token manual).

## Variables nuevas (Vercel)

| Variable | Uso |
|----------|-----|
| `STRIPE_SECRET_KEY` | Checkout y webhooks |
| `STRIPE_WEBHOOK_SECRET` | Firmar eventos Stripe |
| `STRIPE_PRICE_STARTER` | Price ID plan Starter |
| `STRIPE_PRICE_EVENT_PRO` | Price ID plan Event Pro |
| `STRIPE_PRICE_BUSINESS` | Price ID plan Business |

## Migración DB

```bash
npm run db:push
npm run db:seed
```

O SQL manual: [`SAAS_MIGRATION_SQL.md`](SAAS_MIGRATION_SQL.md).

## Onboarding de un negocio nuevo

1. `/pricing` → elegir plan → `/onboarding`.
2. Crear cuenta (nombre, slug, email owner).
3. Stripe Checkout (si configurado) o cuenta gratis.
4. Owner recibe magic link en `/login`.
5. Admin → configurar fechas, webhook (`?org=slug`), impresora.

## Webhook ClickFunnels por tenant

```
POST https://tu-dominio/api/webhooks/clickfunnels?org=mi-negocio
Header: X-Webhook-Secret: <secreto del org en DB o env legacy>
```

## Impresora Mac

1. Admin → **Impresora** → Generar código.
2. Mac: `git clone .../impresora-auto` → `zsh emparejar.sh` → `zsh instalar.sh`.

## App móvil

Ver [`MOBILE_APP.md`](MOBILE_APP.md).
