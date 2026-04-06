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

Diseño compacto con la paleta de marca: fondo oscuro semitransparente, label pequeño, fila de puntos y una sola línea de texto en dorado. Tipografía **Lato** (Google Fonts) vía `<link>` al inicio del bloque.

### Cómo usarlo

1. Reemplaza `https://TU-DOMINIO.vercel.app` con tu URL de Vercel (sin barra al final).
2. Pega el bloque en un elemento **Custom JS/HTML** de ClickFunnels.
3. Ajusta `MAX_SPACES` (total de cupos) y `POLL_MS` (intervalo en ms, default 10 s) si hace falta.

**Dos wrappers (solo móvil / solo escritorio):** puedes pegar el **mismo bloque completo** en cada uno. Cada copia usa su propio contenedor (sin `id` globales duplicados), así no se pisan. Nota: habrá **dos peticiones** al API cada `POLL_MS` si ambos están en la página; si quieres una sola petición, usa un único bloque responsive.

**Móvil:** la fila de puntos va en **una sola línea** (puntos más pequeños + menos padding). Si la pantalla es muy estrecha, puedes **deslizar** horizontalmente la fila. La fila de puntos aparece al instante en tono neutro hasta que llega el API.

**Escritorio:** si ves “Cargando…” fijo, revisa la URL del API o la consola del navegador. Este snippet usa solo `fetch` estándar.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet" />
<div class="workshop-spaces-widget">
  <style>
    .workshop-spaces-widget {
      font-family: "Lato", system-ui, sans-serif;
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
    }
    .workshop-spaces-widget * { box-sizing: border-box; margin: 0; padding: 0; }
    .ws-box {
      background: rgba(34, 32, 34, 0.72);
      border: 1px solid rgba(76, 92, 104, 0.55);
      border-radius: 14px;
      padding: 3rem 3.5rem;
      text-align: center;
    }
    @media (max-width: 480px) {
      .ws-box {
        padding: 1.5rem 1rem;
      }
    }
    .ws-label {
      font-size: 0.95rem;
      color: rgba(242, 242, 242, 0.62);
      letter-spacing: 0.05em;
      margin-bottom: 2.25rem;
    }
    @media (max-width: 480px) {
      .ws-label {
        margin-bottom: 1.35rem;
      }
    }
    /* Una sola fila: puntos más pequeños en móvil; si no cupiera, scroll horizontal sin barra */
    .ws-dots {
      display: flex;
      flex-wrap: nowrap;
      justify-content: center;
      align-items: center;
      gap: clamp(2px, 1.1vw, 7px);
      margin-bottom: 2.25rem;
      max-width: 100%;
      margin-left: auto;
      margin-right: auto;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x;
      scrollbar-width: none;
    }
    .ws-dots::-webkit-scrollbar {
      display: none;
    }
    @media (max-width: 480px) {
      .ws-dots {
        margin-bottom: 1.35rem;
      }
    }
    .ws-dot {
      width: clamp(5px, 2.2vw, 11px);
      height: clamp(5px, 2.2vw, 11px);
      border-radius: 50%;
      flex-shrink: 0;
    }
    .ws-dot-free  { background: #ffc907; box-shadow: 0 0 6px rgba(255, 201, 7, 0.45); }
    .ws-dot-taken { background: rgba(76, 92, 104, 0.48); }
    .ws-dot-skel  { background: rgba(76, 92, 104, 0.22); }
    .ws-line {
      font-size: clamp(1rem, 4vw, 1.25rem);
      font-weight: 700;
      color: #ffc907;
    }
  </style>

  <div class="ws-box">
    <p class="ws-label">Exclusivos Espacios Disponibles:</p>
    <div class="ws-dots" data-ws-dots aria-hidden="true"></div>
    <p class="ws-line" data-ws-line>Cargando…</p>
  </div>
  <script>
  (function () {
    var root =
      document.currentScript &&
      document.currentScript.closest(".workshop-spaces-widget");
    if (!root) return;

    var API_URL = "https://TU-DOMINIO.vercel.app";
    var MAX_SPACES = 20;
    var POLL_MS = 10000;

    var elDots = root.querySelector("[data-ws-dots]");
    var elLine = root.querySelector("[data-ws-line]");
    if (!elDots || !elLine) return;

    function endpoint(base) {
      return String(base).trim().replace(/\/+$/, "") + "/api/spaces";
    }

    function renderDots(available) {
      var n = Math.max(0, Math.min(available, MAX_SPACES));
      elDots.innerHTML = "";
      for (var i = 0; i < MAX_SPACES; i++) {
        var d = document.createElement("div");
        d.className = "ws-dot " + (i < n ? "ws-dot-free" : "ws-dot-taken");
        elDots.appendChild(d);
      }
    }

    function renderSkeleton() {
      elDots.innerHTML = "";
      for (var i = 0; i < MAX_SPACES; i++) {
        var d = document.createElement("div");
        d.className = "ws-dot ws-dot-skel";
        elDots.appendChild(d);
      }
    }

    renderSkeleton();

    function render(available) {
      var n = Math.max(0, Math.min(available, MAX_SPACES));
      renderDots(n);
      elLine.textContent = "Solo " + n + " Exclusivos Espacios Disponibles";
    }

    function fetchSpaces() {
      try {
        fetch(endpoint(API_URL), { cache: "no-store", credentials: "omit" })
          .then(function (r) {
            if (!r.ok) throw r;
            return r.json();
          })
          .then(function (d) {
            render(typeof d.available === "number" ? d.available : 0);
          })
          .catch(function () {
            elLine.textContent = "No disponible en este momento.";
          });
      } catch (e) {
        elLine.textContent = "No disponible en este momento.";
      }
    }

    fetchSpaces();
    setInterval(fetchSpaces, POLL_MS);
  })();
  </script>
</div>
```

---

## Widget 2 — Solo texto (sin caja extra)

Solo las **dos líneas** de copy: total tachado y cupos que quedan. **Sin ícono, sin título, sin borde ni fondo** del snippet, para que no se vea una “caja dentro de la caja” de tu funnel. Usa **Lato** (mismos `<link>` que el widget 1). Misma lógica **por instancia** que el widget 1 (válido si pegas uno en móvil y otro en escritorio).

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet" />
<div class="workshop-spaces-alert">
  <style>
    .workshop-spaces-alert {
      font-family: "Lato", system-ui, sans-serif;
      width: 100%;
      max-width: 100%;
      margin: 0;
      padding: 0;
      background: transparent;
      border: none;
      box-shadow: none;
    }
    .workshop-spaces-alert * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    .workshop-spaces-alert .wsa-plain {
      text-align: center;
      background: transparent;
      border: none;
      padding: 0;
    }
    .workshop-spaces-alert .wsa-total {
      font-size: 1.0625rem;
      font-weight: 300;
      line-height: 1.5;
      color: #071f2f;
      opacity: 0.55;
      text-decoration: line-through;
      margin-bottom: 0.65rem;
    }
    .workshop-spaces-alert .wsa-remaining {
      font-size: 1.0625rem;
      font-weight: 300;
      line-height: 1.5;
      color: #071f2f;
    }
  </style>

  <div class="wsa-plain">
    <p class="wsa-total" data-wsa-total>20 Exclusivos Espacios</p>
    <p class="wsa-remaining" data-wsa-remaining>Cargando…</p>
  </div>
  <script>
  (function () {
    var root =
      document.currentScript &&
      document.currentScript.closest(".workshop-spaces-alert");
    if (!root) return;

    var API_URL = "https://TU-DOMINIO.vercel.app";
    var MAX_SPACES = 20;
    var POLL_MS = 10000;

    var elTotal = root.querySelector("[data-wsa-total]");
    var elRemaining = root.querySelector("[data-wsa-remaining]");
    if (!elTotal || !elRemaining) return;

    elTotal.textContent = MAX_SPACES + " Exclusivos Espacios";

    function endpoint(base) {
      return String(base).trim().replace(/\/+$/, "") + "/api/spaces";
    }

    function render(available) {
      var n = Math.max(0, Math.min(available, MAX_SPACES));
      elRemaining.textContent = "Queda " + n + " espacios disponibles.";
    }

    function fetchSpaces() {
      fetch(endpoint(API_URL), { cache: "no-store", credentials: "omit" })
        .then(function (r) {
          if (!r.ok) throw r;
          return r.json();
        })
        .then(function (d) {
          render(typeof d.available === "number" ? d.available : 0);
        })
        .catch(function () {
          elRemaining.textContent = "No disponible en este momento.";
        });
    }

    fetchSpaces();
    setInterval(fetchSpaces, POLL_MS);
  })();
  </script>
</div>
```

---

### Notas de seguridad

- El **token de administración** solo se usa en `POST /api/admin/spaces` desde tu panel `/admin` o herramientas como `curl`; **no** va en ninguno de los snippets de ClickFunnels.
- Los snippets solo llaman al **GET público**; no exponen secretos.

## Scripts npm

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor tras `build` |
| `npm run lint` | ESLint |

## Licencia

Uso privado del proyecto.
