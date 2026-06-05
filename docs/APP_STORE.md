# App Store — Hernandez Pass (iOS)

## Identidad

| Campo | Valor |
|-------|--------|
| Nombre público | Hernandez Pass |
| Bundle ID | `com.hernandezmedia.pass` |
| URL scheme | `hernandezpass://` |
| Categoría | Business / Productivity |

## Requisitos previos

- Apple Developer Program activo
- [EAS CLI](https://docs.expo.dev/build/setup/): `npm i -g eas-cli`
- Cuenta Expo: `eas login`

## Configurar el proyecto móvil

```bash
cd apps/mobile
npm install
eas init   # crea projectId en app.json → extra.eas.projectId
```

Edita `app.json` / `eas.json` con tu Apple Team ID y Apple ID.

## Build TestFlight

```bash
cd apps/mobile
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

## Permisos (ya en app.json)

- **Cámara**: escaneo QR de pases.
- No se cobra suscripción dentro de la app (billing en web SaaS).

## White-label

Cada negocio ingresa su **código** (slug) en el login. La app carga:

- `displayName`, `appTitle`, colores, logo desde `GET /api/mobile/org/:slug`

## API y dominio

- Producción: **https://pass.edgardohernandez.com**
- Vercel: `APP_BASE_URL=https://pass.edgardohernandez.com`

## Deep links

- Magic link email abre: `hernandezpass://auth?token=...`
- Associated Domain en `app.json`: `applinks:pass.edgardohernandez.com` (opcional; el enlace del email también redirige vía web).

## Checklist App Review

- [ ] Cuenta de prueba (email staff en una org de demo)
- [ ] Video o notas: la app requiere Mac con impresora para labels (opcional)
- [ ] Política de privacidad URL pública
- [ ] Ícono 1024×1024 sin transparencia
- [ ] Screenshots iPhone 6.7" y iPad si `supportsTablet`

## Desarrollo local

```bash
cd apps/mobile
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000 npm start
```

En otro terminal: `npm run dev` en la raíz del monorepo.
