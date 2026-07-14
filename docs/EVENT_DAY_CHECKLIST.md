# Checklist — ventas y día del evento

Imprime o revisa cada mañana. Detalle en [`HERNANDEZ_PASS.md`](HERNANDEZ_PASS.md).

## Antes de abrir ventas

- [ ] Admin → **Fechas**: una fecha **En venta** por taller.
- [ ] ClickFunnels: URL con `?workshop=` por funnel ([`CLICKFUNNELS_SETUP.md`](CLICKFUNNELS_SETUP.md)).
- [ ] AT&T / Duplica → URL `workshop=duplica-ventas`.
- [ ] Admin → **Webhook** → Probar webhook → **HTTP 200**.

## Cada mañana de ventas

- [ ] Admin → **Compras sin asignar** = 0 (o resolver).
- [ ] Admin → **Invitados pendientes** = 0 (o contactar compradores).

## Día del evento (30 min antes)

- [ ] Admin → **Fechas** → **Marcar evento de hoy** por taller del día.
- [ ] App móvil → pestaña **Evento** → elegir la fecha correcta (taller en el nombre).
- [ ] Mac: Impresora Auto activa, Rollo conectada, `PRINT_AGENT_TOKEN` = Vercel.
- [ ] Prueba: 1 scan → label **Imprimiendo…** → sale de impresora.
- [ ] Duplica: verificar acceso La Bóveda si aplica.

## Durante el evento

- [ ] 1 QR = 1 check-in = 1 label.
- [ ] Rescan = “Ya registrado” (no reimprime solo).
- [ ] Si no imprime: **Lista** → **Reimprimir** (o Admin → Personas).
- [ ] Invitado sin QR = falta formulario de boletos extra → **Invitados pendientes**.

## Accesos rápidos

| Rol | URL |
|-----|-----|
| Admin web | https://pass.edgardohernandez.com/login?intent=admin&next=/admin |
| Staff web | https://pass.edgardohernandez.com/login?intent=staff&next=/staff/scan |
| App móvil | Magic link → Evento / Escanear / Admin |
