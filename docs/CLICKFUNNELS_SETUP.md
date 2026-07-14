# ClickFunnels — cableado Hernandez Pass

Usa **una URL por taller**. Mismo webhook secret en los tres endpoints.

## URLs (producción)

Pega cada URL en el funnel/taller correspondiente en ClickFunnels → Webhooks → POST:

| Taller | URL |
|--------|-----|
| **Duplica Ventas** (incl. flujo AT&T) | `https://pass.edgardohernandez.com/api/webhooks/clickfunnels?org=hernandez&workshop=duplica-ventas` |
| **Canva** | `https://pass.edgardohernandez.com/api/webhooks/clickfunnels?org=hernandez&workshop=canva` |
| **Oferta Webinar** | `https://pass.edgardohernandez.com/api/webhooks/clickfunnels?org=hernandez&workshop=oferta-webinar` |

## Secreto

1. En ClickFunnels, al crear cada endpoint, copia el **webhook secret**.
2. En Vercel: variable `CLICKFUNNELS_WEBHOOK_SECRET` (mismo valor en los tres).
3. Opcional: Admin → Webhook → guardar secreto en DB.

## Eventos recomendados

- `order.completed`
- `one-time-order.completed`

## Verificación

1. Admin → **Fechas** → **Marcar en venta** para el taller.
2. Admin → **Webhook** → **Probar webhook** → HTTP **200**.
3. Si falla **422**: falta fecha en venta.
4. Si falla **401**: secreto no coincide.

## No usar

- URL genérica sin `?workshop=` (salvo funnels con token vcanva/vdtv en el nombre).
- Un solo webhook para todos los funnels sin parámetro de taller.

## Si una compra cae “sin taller”

Admin → **Compras sin asignar** → asigna el taller correcto.  
Prevención: corregir la URL del funnel en ClickFunnels.
