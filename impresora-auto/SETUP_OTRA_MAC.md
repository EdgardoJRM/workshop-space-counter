# Mac del evento — instalación desde GitHub

## 1. Clonar e instalar

```bash
git clone --depth 1 https://github.com/EdgardoJRM/workshop-space-counter.git ~/hernandez-pass && \
cd ~/hernandez-pass/impresora-auto && \
cp .env.local.example .env.local
```

Abre `.env.local` y completa `APP_BASE_URL` y `PRINT_AGENT_TOKEN` (igual que en Vercel, sin comillas).

```bash
zsh instalar.sh
```

## 2. Rollo

- Encendida y conectada por USB
- **Impresora predeterminada** en Ajustes del sistema
- `lpstat -d` debe mostrar la Rollo

## 3. Probar

```bash
tail -f "$HOME/Library/Logs/Impresora Auto/server.log"
```

Debe decir `Cloud agent activo` (sin `401`).

En admin: **Registros → Reimprimir label**, o escanea un check-in nuevo en `/staff/scan`.

## 4. Actualizar después

```bash
cd ~/hernandez-pass && git pull && cd impresora-auto && \
launchctl kickstart -k "gui/$(id -u)/com.edgardo.impresora-auto"
```

## 5. En tu Mac de desarrollo (opcional)

Para que no compita con la del evento:

```bash
launchctl bootout "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.edgardo.impresora-auto.plist" 2>/dev/null || true
```
