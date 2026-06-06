# iOS — Hernandez Pass Staff

App nativa (Expo) para check-in, lista y estado de impresora. Se conecta a **[pass.edgardohernandez.com](https://pass.edgardohernandez.com/)**.

## Antes de probar la app (obligatorio)

El código de `app/api/mobile/*` y `apps/mobile/` debe estar **desplegado** en Vercel. Hoy producción aún no expone esas rutas (devuelven 404).

1. Commit + push del repo a GitHub.
2. Redeploy en Vercel (dominio `pass.edgardohernandez.com`).
3. En Vercel → Environment Variables (Production):

| Variable | Valor |
|----------|--------|
| `APP_BASE_URL` | `https://pass.edgardohernandez.com` |
| `AUTH_JWT_SECRET` | (ya configurado) |
| `POSTGRES_*` | (Supabase, ya migrado) |
| `APPLE_TEAM_ID` | (opcional) Tu Team ID de Apple Developer — activa Universal Links en `/.well-known/apple-app-site-association` |

4. Comprueba en el navegador:

```text
https://pass.edgardohernandez.com/api/mobile/org/hernandez
```

Debe responder JSON con `organization` (nombre, colores, etc.), no una página 404.

---

## Probar sin App Store (rápido)

En iPhone, Safari:

```text
https://pass.edgardohernandez.com/staff/scan
```

Compartir → **Añadir a pantalla de inicio** (PWA con cámara QR). No sustituye la app de App Store, pero sirve el mismo día del evento.

---

## App Store (Expo + EAS)

Requisitos: Apple Developer Program, [EAS CLI](https://docs.expo.dev/build/setup/) (`npm i -g eas-cli`), `eas login`.

```bash
cd apps/mobile
npm install
eas init    # guarda projectId en app.json → extra.eas.projectId
```

Edita `eas.json` → `submit.production.ios` con tu Apple ID, Team ID y App Store Connect App ID.

### Desarrollo en simulador

```bash
EXPO_PUBLIC_API_BASE_URL=https://pass.edgardohernandez.com npm start
```

Pulsa `i` para abrir el simulador iOS.

### Build TestFlight

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

La URL de API en producción ya está en `eas.json` (`EXPO_PUBLIC_API_BASE_URL`).

---

## Login en la app

1. **Código del negocio:** `hernandez` (slug de la org en Supabase).
2. **Email:** el que registraste en `OrganizationMember`.
3. **Entrar como Staff** (check-in) o **Entrar como Admin** (configuración completa).
4. **Enlace mágico** por correo → abre la app con `hernandezpass://auth?token=...`.

Si el correo abre Safari primero, la página en `pass.edgardohernandez.com` redirige a la app automáticamente.

---

## Admin en la app (pestaña Admin)

Misma funcionalidad que el admin web:

- Cupos (widget ClickFunnels)
- Fechas del taller
- Registros (manual, CSV, reenviar pase, reimprimir label)
- Plantilla de labels Rollo
- Emparejar impresora Mac
- Webhook ClickFunnels (copiar URL)
- Emails / automatizaciones post-evento
- Marca / white-label
- Push notifications (check-in, registros, errores de impresión)

### Push notifications (producción)

1. Ejecuta el SQL en `docs/PUSH_NOTIFICATIONS_SQL.md` en Supabase (tabla `MobilePushToken`).
2. Redeploy del backend (ruta `POST /api/mobile/push/register`).
3. Build nativo con `expo-notifications` (TestFlight); el simulador no recibe push remotos.

---

## White-label (otros negocios)

Cada cliente usa su slug en el login. Branding desde:

`GET /api/mobile/org/:slug`

---

## Mac impresora

No va en App Store. Ver [`impresora-auto/README.md`](../impresora-auto/README.md) y emparejamiento con `APP_BASE_URL=https://pass.edgardohernandez.com`.

---

## Más detalle App Review

[`APP_STORE.md`](APP_STORE.md)
