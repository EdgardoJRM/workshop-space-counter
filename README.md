# Workshop Space Counter / Hernandez Pass

Aplicación **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS** para mostrar y actualizar en vivo los **espacios disponibles** de un taller. Los datos persisten en **Upstash Redis**. Pensada para **Vercel** y consumo desde **ClickFunnels** vía un bloque HTML/JS.

## Hernandez Pass (MVP)

Esta misma app incluye **Hernandez Pass**: registro vía webhook de ClickFunnels, pase con QR, email al asistente, check-in staff y sincronización automática del contador de cupos. El contador público y el panel `/admin` de cupos **se mantienen sin cambios** para los funnels existentes.

Guía completa de despliegue y operación: [docs/HERNANDEZ_PASS.md](docs/HERNANDEZ_PASS.md).

| Ruta | Uso |
|------|-----|
| `/admin` | Cupos + registros |
| `/staff/scan` | Scanner check-in |
| `/pass/[token]` | Pase del asistente |
| `POST /api/webhooks/clickfunnels` | Compra/registro desde CF |

## Estructura del proyecto

```
├── app/
│   ├── admin/
│   │   ├── layout.tsx          # Metadata del panel
│   │   └── page.tsx            # Pestañas por taller + SpacesForm
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

### Keys en Redis (multi-taller)

Cada taller tiene su par de keys:

| Slug | Keys |
|------|------|
| `duplica-ventas` | `workshop:duplica-ventas:available` / `workshop:duplica-ventas:updatedAt` |
| `canva` | `workshop:canva:available` / `workshop:canva:updatedAt` |
| `oferta-webinar` | `workshop:oferta-webinar:available` / `workshop:oferta-webinar:updatedAt` |

**Migración:** los datos antiguos estaban en `workshop:general:*`. Para **Duplica Tus Ventas**, si la key nueva aún no existe, la API lee `workshop:general:*` como respaldo. Tras guardar una vez desde `/admin` en esa pestaña, queda persistido en `workshop:duplica-ventas:*`.

Los slugs y etiquetas viven en `lib/workshop-keys.ts` (`WORKSHOPS`).

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

   Por taller, usa el query param **`?w=<slug>`** (p. ej. `?w=canva` o `?w=oferta-webinar`). Si omites `w`, el valor por defecto es **`duplica-ventas`** (compatible con enlaces antiguos sin query).

## Probar los endpoints

### GET `/api/spaces` (público)

```bash
# Duplica Tus Ventas (por defecto; equivale a ?w=duplica-ventas)
curl -sS -D - "https://<tu-dominio>/api/spaces"

# Taller de Canva
curl -sS -D - "https://<tu-dominio>/api/spaces?w=canva"

# Oferta Webinar
curl -sS -D - "https://<tu-dominio>/api/spaces?w=oferta-webinar"
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

Body JSON: `available` (entero ≥ 0), `token` (igual que `ADMIN_TOKEN`), y opcionalmente **`workshop`** (slug del catálogo: `"duplica-ventas"`, `"canva"`, `"oferta-webinar"`). Si no envías `workshop`, se asume **`duplica-ventas`**.

```bash
curl -sS -X POST "https://<tu-dominio>/api/admin/spaces" \
  -H "Content-Type: application/json" \
  -d '{"available":17,"token":"TU_ADMIN_TOKEN","workshop":"canva"}'
```

Respuesta exitosa (ejemplo):

```json
{
  "ok": true,
  "available": 17,
  "updatedAt": "2026-04-06T12:00:00.000Z",
  "workshop": "canva"
}
```

Errores habituales: `401` (token), `400` (JSON, `available` o `workshop` inválido), `503` (Redis / configuración).

## Bloque HTML para ClickFunnels

Diseño compacto con la paleta de marca: **Widget 1** con caja oscura semitransparente; **Widget 1b** (más abajo) es la misma lógica con **caja y fondo blanco**. En ambos: label pequeña, fila de puntos y una línea de acento (dorado o lima según `data-ws-theme`). **Espaciado:** caja `padding: 1rem` (en pantallas ≤480px `1.5rem 1rem`), `0.75rem` entre etiqueta, puntos y línea final. Tipografía **Lato** (Google Fonts) vía `<link>` al inicio del bloque.

### Cómo usarlo

1. Reemplaza `https://TU-DOMINIO.vercel.app` con tu URL de Vercel (sin barra al final).
2. En cada funnel, define **`WORKSHOP`**: por ejemplo `"duplica-ventas"`, `"canva"` o `"oferta-webinar"`. El `fetch` usa `/api/spaces?w=` + ese valor.
3. Pega el bloque en un elemento **Custom JS/HTML** de ClickFunnels.
4. Ajusta **`MAX_SPACES`** (cuántos “cupos” dibuja el widget y el texto; debe coincidir con el total que muestras en copy): **25** para Duplica Tus Ventas, **10** para Canva. Ajusta **`POLL_MS`** (intervalo en ms, default 10 s) si hace falta.
5. **Color de acento (solo Widget 1):** el dorado `#ffc907` y el lima `#ecf000` no se eligen solo con variables sueltas: si hay **varios** bloques del widget en la misma página, el **último** `<style>` ganaba para **todos** (mismo selector `.workshop-spaces-widget`). **Solución:** en el `<div>` raíz del funnel de **Canva** añade **`data-ws-theme="canva"`**. Duplica Ventas puede ir **sin** atributo o con `data-ws-theme="duplica-ventas"`. El CSS del snippet ya define los dos acentos según ese atributo.

**Dos wrappers (solo móvil / solo escritorio):** puedes pegar el **mismo bloque completo** en cada uno. Cada copia usa su propio contenedor (sin `id` globales duplicados), así no se pisan. Nota: habrá **dos peticiones** al API cada `POLL_MS` si ambos están en la página; si quieres una sola petición, usa un único bloque responsive.

**Móvil:** la fila de puntos va en **una sola línea** dentro de la caja (6px fijos + gap 2px para 25 cupos). La fila aparece al instante en tono neutro hasta que llega el API.

**Escritorio:** si ves “Cargando…” fijo, revisa la URL del API o la consola del navegador. Este snippet usa solo `fetch` estándar.

**Si en móvil no se ven puntos (pero sí el texto):** suele ser CSS con `calc(100%)` en flex (Safari los deja en 0px) o el `<script>` fuera del `<div class="workshop-spaces-widget">`. El snippet actual usa puntos de **6px** en móvil y `findWidgetRoot()` para ClickFunnels. El `<script>` debe ser **hijo directo** del `div` raíz del widget, no en otro bloque CF.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet" />
<div class="workshop-spaces-widget" data-ws-theme="duplica-ventas">
  <style>
    .workshop-spaces-widget {
      font-family: "Lato", system-ui, sans-serif;
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
    }
    .workshop-spaces-widget:not([data-ws-theme="canva"]) {
      --ws-accent: #ffc907;
      --ws-accent-glow: rgba(255, 201, 7, 0.45);
    }
    .workshop-spaces-widget[data-ws-theme="canva"] {
      --ws-accent: #ecf000;
      --ws-accent-glow: rgba(236, 240, 0, 0.45);
    }
    .workshop-spaces-widget * { box-sizing: border-box; margin: 0; padding: 0; }
    .workshop-spaces-widget .ws-box {
      background: rgba(34, 32, 34, 0.72);
      border: 1px solid rgba(76, 92, 104, 0.55);
      border-radius: 14px;
      padding: 1rem 1rem;
      text-align: center;
    }
    @media (max-width: 480px) {
      .workshop-spaces-widget .ws-box {
        padding: 1.5rem 1rem;
      }
    }
    .workshop-spaces-widget .ws-label {
      font-size: 0.95rem;
      color: rgba(242, 242, 242, 0.62);
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
    }
    /* Una fila; en escritorio scroll suave si hace falta; en móvil (abajo) escala a 25 puntos */
    .workshop-spaces-widget .ws-dots {
      display: flex;
      flex-wrap: nowrap;
      justify-content: center;
      align-items: center;
      gap: clamp(2px, 1.1vw, 7px);
      margin-bottom: 0.75rem;
      max-width: 100%;
      margin-left: auto;
      margin-right: auto;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x;
      scrollbar-width: none;
    }
    .workshop-spaces-widget .ws-dots::-webkit-scrollbar {
      display: none;
    }
    .workshop-spaces-widget .ws-dot {
      width: clamp(5px, 2.2vw, 11px);
      height: clamp(5px, 2.2vw, 11px);
      border-radius: 50%;
      flex-shrink: 0;
    }
    .workshop-spaces-widget .ws-dot-free  { background: var(--ws-accent); box-shadow: 0 0 6px var(--ws-accent-glow); }
    .workshop-spaces-widget .ws-dot-taken { background: rgba(76, 92, 104, 0.48); }
    .workshop-spaces-widget .ws-dot-skel  { background: rgba(76, 92, 104, 0.22); }
    .workshop-spaces-widget .ws-line {
      font-size: clamp(1rem, 4vw, 1.25rem);
      font-weight: 700;
      color: var(--ws-accent);
    }
    @media (max-width: 480px) {
      .workshop-spaces-widget .ws-dots {
        width: 100%;
        gap: 2px;
        overflow-x: hidden;
        padding-inline: 2px;
        min-height: 8px;
      }
      /* Tamaño fijo (evita calc(100%) en flex → 0px en Safari / ClickFunnels móvil) */
      .workshop-spaces-widget .ws-dot {
        flex: 0 0 6px;
        width: 6px;
        height: 6px;
        min-width: 6px;
        min-height: 6px;
      }
      .workshop-spaces-widget .ws-dot-free {
        box-shadow: 0 0 4px var(--ws-accent-glow);
      }
    }
  </style>

  <div class="ws-box">
    <p class="ws-label">Exclusivos Espacios Disponibles:</p>
    <div class="ws-dots" data-ws-dots aria-hidden="true"></div>
    <p class="ws-line" data-ws-line>Cargando…</p>
  </div>
  <script>
  (function () {
    function findWidgetRoot() {
      var s = document.currentScript;
      if (s) {
        var parent = s.parentElement;
        if (parent && parent.classList && parent.classList.contains("workshop-spaces-widget")) {
          return parent;
        }
        var closest = s.closest(".workshop-spaces-widget");
        if (closest) return closest;
      }
      var pending = document.querySelectorAll(
        ".workshop-spaces-widget:not([data-ws-ready])"
      );
      return pending.length ? pending[0] : null;
    }

    var root = findWidgetRoot();
    if (!root) return;
    root.setAttribute("data-ws-ready", "1");

    var API_URL = "https://TU-DOMINIO.vercel.app";
    var WORKSHOP = "duplica-ventas"; // "canva" | "oferta-webinar"
    var MAX_SPACES = 25; // Canva: 10
    var POLL_MS = 10000;

    var elDots = root.querySelector("[data-ws-dots]");
    var elLine = root.querySelector("[data-ws-line]");
    if (!elDots || !elLine) return;

    function endpoint(base) {
      return (
        String(base).trim().replace(/\/+$/, "") +
        "/api/spaces?w=" +
        encodeURIComponent(WORKSHOP)
      );
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

## Widget 1b — Mismo contador, caja con **fondo blanco**

Misma lógica JS y mismos `WORKSHOP` / `data-ws-theme` que el Widget 1. La raíz incluye la clase extra **`workshop-spaces-widget--light`**: caja blanca, etiqueta en gris oscuro, puntos ocupados en gris suave. El `script` sigue usando `closest(".workshop-spaces-widget")` y funciona con ambas variantes.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet" />
<div class="workshop-spaces-widget workshop-spaces-widget--light" data-ws-theme="duplica-ventas">
  <style>
    .workshop-spaces-widget.workshop-spaces-widget--light {
      font-family: "Lato", system-ui, sans-serif;
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
    }
    .workshop-spaces-widget.workshop-spaces-widget--light:not([data-ws-theme="canva"]) {
      --ws-accent: #ffc907;
      --ws-accent-glow: rgba(255, 201, 7, 0.4);
    }
    .workshop-spaces-widget.workshop-spaces-widget--light[data-ws-theme="canva"] {
      --ws-accent: #ecf000;
      --ws-accent-glow: rgba(236, 240, 0, 0.4);
    }
    .workshop-spaces-widget.workshop-spaces-widget--light * { box-sizing: border-box; margin: 0; padding: 0; }
    .workshop-spaces-widget--light .ws-box {
      background: #ffffff;
      border: 1px solid rgba(15, 23, 42, 0.1);
      border-radius: 14px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
      padding: 1rem 1rem;
      text-align: center;
    }
    @media (max-width: 480px) {
      .workshop-spaces-widget--light .ws-box {
        padding: 1.5rem 1rem;
      }
    }
    .workshop-spaces-widget--light .ws-label {
      font-size: 0.95rem;
      color: #475569;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
    }
    .workshop-spaces-widget--light .ws-dots {
      display: flex;
      flex-wrap: nowrap;
      justify-content: center;
      align-items: center;
      gap: clamp(2px, 1.1vw, 7px);
      margin-bottom: 0.75rem;
      max-width: 100%;
      margin-left: auto;
      margin-right: auto;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x;
      scrollbar-width: none;
    }
    .workshop-spaces-widget--light .ws-dots::-webkit-scrollbar { display: none; }
    .workshop-spaces-widget--light .ws-dot {
      width: clamp(5px, 2.2vw, 11px);
      height: clamp(5px, 2.2vw, 11px);
      border-radius: 50%;
      flex-shrink: 0;
    }
    .workshop-spaces-widget--light .ws-dot-free  { background: var(--ws-accent); box-shadow: 0 0 6px var(--ws-accent-glow); }
    .workshop-spaces-widget--light .ws-dot-taken { background: rgba(15, 23, 42, 0.12); }
    .workshop-spaces-widget--light .ws-dot-skel  { background: rgba(15, 23, 42, 0.08); }
    .workshop-spaces-widget--light .ws-line {
      font-size: clamp(1rem, 4vw, 1.25rem);
      font-weight: 700;
      color: var(--ws-accent);
    }
    @media (max-width: 480px) {
      .workshop-spaces-widget--light .ws-dots {
        width: 100%;
        gap: 2px;
        overflow-x: hidden;
        padding-inline: 2px;
        min-height: 8px;
      }
      .workshop-spaces-widget--light .ws-dot {
        flex: 0 0 6px;
        width: 6px;
        height: 6px;
        min-width: 6px;
        min-height: 6px;
      }
      .workshop-spaces-widget--light .ws-dot-free {
        box-shadow: 0 0 4px var(--ws-accent-glow);
      }
    }
  </style>

  <div class="ws-box">
    <p class="ws-label">Exclusivos Espacios Disponibles:</p>
    <div class="ws-dots" data-ws-dots aria-hidden="true"></div>
    <p class="ws-line" data-ws-line>Cargando…</p>
  </div>
  <script>
  (function () {
    function findWidgetRoot() {
      var s = document.currentScript;
      if (s) {
        var parent = s.parentElement;
        if (parent && parent.classList && parent.classList.contains("workshop-spaces-widget")) {
          return parent;
        }
        var closest = s.closest(".workshop-spaces-widget");
        if (closest) return closest;
      }
      var pending = document.querySelectorAll(
        ".workshop-spaces-widget:not([data-ws-ready])"
      );
      return pending.length ? pending[0] : null;
    }

    var root = findWidgetRoot();
    if (!root) return;
    root.setAttribute("data-ws-ready", "1");

    var API_URL = "https://TU-DOMINIO.vercel.app";
    var WORKSHOP = "duplica-ventas"; // "canva" | "oferta-webinar"
    var MAX_SPACES = 25; // Canva: 10
    var POLL_MS = 10000;

    var elDots = root.querySelector("[data-ws-dots]");
    var elLine = root.querySelector("[data-ws-line]");
    if (!elDots || !elLine) return;

    function endpoint(base) {
      return (
        String(base).trim().replace(/\/+$/, "") +
        "/api/spaces?w=" +
        encodeURIComponent(WORKSHOP)
      );
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

    var API_URL = "https://workshop-space-counter.vercel.app";
    var WORKSHOP = "duplica-ventas"; // "canva" | "oferta-webinar"
    var MAX_SPACES = 20; // Canva: 10
    var POLL_MS = 10000;

    var elTotal = root.querySelector("[data-wsa-total]");
    var elRemaining = root.querySelector("[data-wsa-remaining]");
    if (!elTotal || !elRemaining) return;

    elTotal.textContent = MAX_SPACES + " Exclusivos Espacios";

    function endpoint(base) {
      return (
        String(base).trim().replace(/\/+$/, "") +
        "/api/spaces?w=" +
        encodeURIComponent(WORKSHOP)
      );
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

## Widget 2b — Solo texto, letra blanca (móvil / escritorio)

Misma lógica que el Widget 2 (dos líneas, sin caja), pero **tipografía Barlow Semi Condensed**, **25px**, **letter-spacing 0.01em**, **line-height 130%**, **color blanco**. Puedes pegar **el mismo bloque** en el wrapper solo móvil y en el solo escritorio; el contenedor es `workshop-spaces-alert-light` (no choca con el Widget 2).

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@300;400;500;600&display=swap" rel="stylesheet" />
<div class="workshop-spaces-alert-light">
  <style>
    .workshop-spaces-alert-light {
      font-family: "Barlow Semi Condensed", system-ui, sans-serif;
      width: 100%;
      max-width: 100%;
      margin: 0;
      padding: 0;
      background: transparent;
      border: none;
      box-shadow: none;
    }
    .workshop-spaces-alert-light * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    .workshop-spaces-alert-light .wsa-plain {
      text-align: center;
      background: transparent;
      border: none;
      padding: 0;
    }
    .workshop-spaces-alert-light .wsa-total,
    .workshop-spaces-alert-light .wsa-remaining {
      font-family: "Barlow Semi Condensed", system-ui, sans-serif;
      font-size: 25px;
      letter-spacing: 0.01em;
      line-height: 1.3;
      color: #ffffff;
      font-weight: 300;
    }
    .workshop-spaces-alert-light .wsa-total {
      opacity: 0.5;
      text-decoration: line-through;
      /* Menos espacio entre la línea tachada y “Queda…” — baja el valor si quieres aún más junto */
      margin-bottom: 0.2rem;
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
      document.currentScript.closest(".workshop-spaces-alert-light");
    if (!root) return;

    var API_URL = "https://workshop-space-counter.vercel.app";
    var WORKSHOP = "duplica-ventas"; // "canva" | "oferta-webinar"
    var MAX_SPACES = 20; // Canva: 10
    var POLL_MS = 10000;

    var elTotal = root.querySelector("[data-wsa-total]");
    var elRemaining = root.querySelector("[data-wsa-remaining]");
    if (!elTotal || !elRemaining) return;

    elTotal.textContent = MAX_SPACES + " Exclusivos Espacios";

    function endpoint(base) {
      return (
        String(base).trim().replace(/\/+$/, "") +
        "/api/spaces?w=" +
        encodeURIComponent(WORKSHOP)
      );
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
