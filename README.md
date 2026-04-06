# Workshop Space Counter

Aplicación **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS** para mostrar y actualizar en vivo los **espacios disponibles** de un taller. Los datos persisten en **Upstash Redis**. Pensada para **Vercel** y consumo desde **ClickFunnels** vía un bloque HTML/JS.

## Estructura del proyecto

```
├── app/
│   ├── admin/page.tsx          # Panel de administración (/admin)
│   ├── api/
│   │   ├── spaces/route.ts     # GET público + OPTIONS (CORS)
│   │   └── admin/spaces/route.ts  # POST privado (token)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── admin/SpacesForm.tsx    # Formulario cliente (preview, validación, estados)
├── lib/
│   ├── cors.ts                 # Cabeceras CORS y caché para API pública
│   ├── redis.ts                # Cliente Upstash y helpers get/set
│   └── workshop-keys.ts        # Nombres de keys Redis (escalable)
├── public/
├── .env.local.example
├── next.config.mjs
├── package.json
├── tailwind.config.ts
└── README.md
```

### Keys en Redis (escalable)

Por defecto se usan:

| Key | Contenido |
|-----|-----------|
| `workshop:general:available` | Entero ≥ 0 |
| `workshop:general:updatedAt` | ISO 8601 (`toISOString()`) |

Para futuros talleres puedes duplicar el patrón `workshop:<slug>:available` / `workshop:<slug>:updatedAt` (el código ya centraliza slugs en `lib/workshop-keys.ts`).

## Requisitos

- Node.js 18+
- Cuenta [Vercel](https://vercel.com) (deploy)
- Base [Upstash Redis](https://upstash.com) (REST)

## Instalación

```bash
npm install
```

## Variables de entorno

Copia el ejemplo y rellena los valores:

```bash
cp .env.local.example .env.local
```

| Variable | Descripción |
|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | URL REST del database Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST |
| `ADMIN_TOKEN` | Secreto para `POST /api/admin/spaces` (cadena larga y aleatoria en producción) |

**Nunca** subas `.env.local` al repositorio (está en `.gitignore`).

## Desarrollo local

```bash
npm run dev
```

- Home: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

## Conectar Upstash Redis

1. Crea un database en [Upstash Console](https://console.upstash.com/).
2. En la pestaña del database, copia **REST URL** y **REST TOKEN** (no la URL `redis://` clásica).
3. Pégalos en `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.

## Desplegar en Vercel

1. Sube el repo a GitHub/GitLab/Bitbucket o usa `vercel`.
2. En el proyecto Vercel → **Settings** → **Environment Variables**, añade las tres variables (Production / Preview / Development según necesites).
3. **Deploy**. Tras el deploy, tu API pública será:

   `https://<tu-dominio>/api/spaces`

## Probar los endpoints

### GET `/api/spaces` (público)

```bash
curl -sS -D - "https://<tu-dominio>/api/spaces"
```

Respuesta JSON:

```json
{
  "available": 17,
  "updatedAt": "2026-04-06T12:00:00.000Z"
}
```

Si aún no hay datos en Redis, `available` será `0` y `updatedAt` será `null`.

Cabeceras relevantes: CORS (`Access-Control-Allow-Origin: *`) y `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`.

### POST `/api/admin/spaces` (privado)

```bash
curl -sS -X POST "https://<tu-dominio>/api/admin/spaces" \
  -H "Content-Type: application/json" \
  -d '{"available":17,"token":"TU_ADMIN_TOKEN"}'
```

Respuesta exitosa (ejemplo):

```json
{
  "ok": true,
  "available": 17,
  "updatedAt": "2026-04-06T12:00:00.000Z"
}
```

Errores habituales: `401` (token), `400` (JSON o `available` inválido), `503` (Redis / configuración).

## Bloque HTML para ClickFunnels

1. Sustituye `BASE_URL` por la URL base de tu app en Vercel (sin barra final), por ejemplo `https://tu-app.vercel.app`.
2. Pega el bloque en un elemento **Custom JS/HTML** en ClickFunnels.
3. Ajusta el texto visible o el `id` del contenedor si lo necesitas.

**Cambiar el intervalo de refresco:** edita la constante `POLL_MS` (por defecto `10000` = 10 segundos).

```html
<div id="workshop-spaces-count">
  <span class="workshop-spaces-number">—</span>
</div>

<script>
(function () {
  var BASE_URL = "https://BASE_URL";
  var POLL_MS = 10000;

  var el = document.querySelector(
    "#workshop-spaces-count .workshop-spaces-number"
  );
  if (!el) return;

  function setText(text) {
    el.textContent = text;
  }

  function fetchSpaces() {
    fetch(BASE_URL + "/api/spaces", {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var n = data && typeof data.available === "number" ? data.available : null;
        setText(n !== null ? String(n) : "—");
      })
      .catch(function () {
        setText("—");
      });
  }

  fetchSpaces();
  setInterval(fetchSpaces, POLL_MS);
})();
</script>
```

### Notas de seguridad

- El **token de administración** solo se usa en `POST /api/admin/spaces` desde tu panel `/admin` o herramientas como `curl`; **no** va en el snippet de ClickFunnels.
- El snippet solo llama al **GET público**; no expone secretos.

## Scripts npm

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor tras `build` |
| `npm run lint` | ESLint |

## Licencia

Uso privado del proyecto.
