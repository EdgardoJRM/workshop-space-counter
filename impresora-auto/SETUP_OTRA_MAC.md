# Mac del evento (con la Rollo) — guía completa

**Esta guía es solo para la Mac donde está la impresora**, no la Mac de desarrollo.

---

## ⚠️ Regla de oro: solo UNA Mac imprime

Solo **una** Mac debe tener el agente corriendo (la que tiene la Rollo conectada).

Si **tu Mac de desarrollo** también tiene el agente activo, **le roba los trabajos** a la Mac del evento — por eso ahí “funciona” y en la otra no.

**En tu Mac de desarrollo, apágalo ahora:**

```bash
launchctl bootout "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.edgardo.impresora-auto.plist" 2>/dev/null || true
```

Verifica que no quede corriendo: `tail ~/Library/Logs/Impresora\ Auto/server.log` no debe seguir escribiendo polls.

---

## Requisitos

- macOS con Python 3 (`python3` en Terminal)
- Rollo conectada por USB y **impresora predeterminada** (Ajustes del sistema → Impresoras)
- Mismo `PRINT_AGENT_TOKEN` que en **Vercel** (sin comillas en `.env.local`)

---

## Si `git clone` no funciona bien (código viejo en GitHub)

Hasta que el repo tenga la última versión, copia el ZIP desde la Mac de desarrollo:

1. En la Mac de desarrollo: archivo **`impresora-auto-para-mac-evento.zip`** en el Desktop (AirDrop a la Mac del evento).
2. En la Mac del evento:

```bash
mkdir -p ~/hernandez-pass/impresora-auto
cd ~/hernandez-pass/impresora-auto
unzip ~/Downloads/impresora-auto-para-mac-evento.zip
cp .env.local.example .env.local
open -e .env.local
# completa APP_BASE_URL y PRINT_AGENT_TOKEN
zsh instalar.sh
```

---

## Paso 1 — Clonar el proyecto (alternativa: ZIP arriba)

Abre **Terminal** en la Mac del evento y pega:

```bash
git clone --depth 1 https://github.com/EdgardoJRM/workshop-space-counter.git ~/hernandez-pass
cd ~/hernandez-pass/impresora-auto
cp .env.local.example .env.local
```

---

## Paso 2 — Configurar `.env.local`

```bash
open -e .env.local
```

Debe quedar así (valores reales, **sin comillas**):

```env
APP_BASE_URL=https://workshop-space-counter.vercel.app
PRINT_AGENT_TOKEN=el-mismo-token-exacto-de-vercel
```

**Importante**

- El token lo copias de **Vercel → proyecto → Settings → Environment Variables → `PRINT_AGENT_TOKEN`**
- Si el token tiene caracteres raros (`|`, `!`, `(`, `/`), **no** lo pongas entre comillas `"..."`
- La URL **sin** `/` al final

En Vercel, después de cambiar el token: **Deployments → Redeploy** (producción).

---

## Paso 3 — Instalar (solo una vez)

```bash
cd ~/hernandez-pass/impresora-auto
zsh instalar.sh
```

Usa **`zsh instalar.sh`**, no los archivos `.command` (macOS a veces los bloquea).

Al terminar debe mostrar la impresora predeterminada, por ejemplo:

```text
system default destination: Printer_ThermalPrinter
```

Si no hay impresora: conecta la Rollo y en Ajustes del sistema márcala como predeterminada. Luego:

```bash
lpstat -d
```

---

## Paso 4 — Probar conexión con la nube

```bash
cd ~/hernandez-pass/impresora-auto
zsh probar-conexion.command
```

(o doble clic en `probar-conexion.command` si Terminal lo permite)

Debe decir: **`OK — API respondió`**

- Si dice **401**: el token en `.env.local` no es el de Vercel → corrige, redeploy en Vercel, vuelve a probar.
- Si dice **timeout / sin red**: revisa Wi‑Fi o firewall.

---

## Paso 5 — Ver que el agente corre

El instalador deja un servicio que arranca solo al iniciar sesión. Ver log en vivo:

```bash
tail -f ~/Library/Logs/Impresora\ Auto/server.log
```

**Log correcto (versión nueva):**

```text
Printer watcher activo.
Modo: cloud (cola Hernandez Pass)
Impresora detectada. Conectando con la nube...
Cloud agent → https://workshop-space-counter.vercel.app
Cola: conectado (sin trabajos pendientes)
Agente listo. Esperando check-ins para imprimir.
```

**Log viejo (hay que actualizar):**

```text
Impresora detectada. Iniciando agente...
```

(sin “Conectando con la nube”) → en esa Mac corre código antiguo. Actualiza:

```bash
cd ~/hernandez-pass && git pull
cd impresora-auto && zsh instalar.sh
launchctl kickstart -k gui/$(id -u)/com.edgardo.impresora-auto
```

---

## Paso 6 — Probar una etiqueta

1. En el admin web: **Registros → Reimprimir label** en alguien, **o**
2. Escanea un check-in nuevo en `/staff/scan`

En el log debería aparecer algo como:

```text
Impreso: Nombre Apellido (job ...)
```

---

## Comandos útiles en la Mac del evento

| Qué | Comando |
|-----|---------|
| Ver log | `tail -f ~/Library/Logs/Impresora\ Auto/server.log` |
| Reiniciar agente | `launchctl kickstart -k gui/$(id -u)/com.edgardo.impresora-auto` |
| Actualizar código | `cd ~/hernandez-pass && git pull && cd impresora-auto && zsh instalar.sh` |
| Parar autoarranque | `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.edgardo.impresora-auto.plist` |

---

## No uses la carpeta del Desktop en la otra Mac

En la Mac de desarrollo puede existir `Desktop/Impresora Auto`. **En la Mac del evento** instala solo desde:

```text
~/hernandez-pass/impresora-auto
```

Así siempre tienes la versión de GitHub y no mezclas copias viejas.

---

## En la Mac de desarrollo (opcional)

Para que no compita con la del evento:

```bash
launchctl bootout "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.edgardo.impresora-auto.plist" 2>/dev/null || true
```
