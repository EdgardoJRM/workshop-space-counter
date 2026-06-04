#!/bin/zsh
set -e

cd "$(dirname "$0")"

APP_DIR="$(pwd)"
VENV_DIR="$APP_DIR/venv"
PYTHON_BIN="$VENV_DIR/bin/python"
PLIST_ID="com.edgardo.impresora-auto"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_ID.plist"
LOG_DIR="$HOME/Library/Logs/Impresora Auto"

echo "Instalando Impresora Auto..."
echo "Carpeta: $APP_DIR"
echo

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: No encuentro python3 en esta Mac."
  echo "Instala Python 3 y vuelve a correr este instalador."
  read "?Presiona Enter para cerrar."
  exit 1
fi

if ! command -v lpr >/dev/null 2>&1; then
  echo "ERROR: No encuentro lpr/CUPS. La Mac necesita el sistema de impresion activo."
  read "?Presiona Enter para cerrar."
  exit 1
fi

python3 -m venv "$VENV_DIR"
"$PYTHON_BIN" -m pip install --upgrade pip
"$PYTHON_BIN" -m pip install -r "$APP_DIR/requirements.txt"

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

ENV_FILE="$APP_DIR/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  echo
  echo "Configuracion de cola en la nube (Hernandez Pass):"
  echo "Usa la misma URL y token que en Vercel (PRINT_AGENT_TOKEN)."
  echo
  read "APP_URL?APP_BASE_URL (ej. https://tu-app.vercel.app): "
  read "AGENT_TOKEN?PRINT_AGENT_TOKEN: "
  if [ -n "$APP_URL" ] && [ -n "$AGENT_TOKEN" ]; then
    cat > "$ENV_FILE" <<ENV
APP_BASE_URL=$APP_URL
PRINT_AGENT_TOKEN=$AGENT_TOKEN
ENV
    echo "Guardado en .env.local"
  else
    echo "Sin .env.local — solo modo local hasta que lo configures."
    cp "$APP_DIR/.env.local.example" "$ENV_FILE" 2>/dev/null || true
  fi
fi

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$PLIST_ID</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PYTHON_BIN</string>
    <string>$APP_DIR/printer_watcher.py</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$APP_DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PORT</key>
    <string>3000</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/server.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/server-error.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)" "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH"

echo
echo "Listo. La Mac queda pendiente a la impresora."
echo "Cuando la impresora aparezca como disponible, el servidor se prende solo."
echo
echo "Impresora predeterminada:"
lpstat -d || true
echo
if [ -f "$ENV_FILE" ] && grep -q PRINT_AGENT_TOKEN "$ENV_FILE" 2>/dev/null; then
  echo "Modo: cola en la nube (cualquier telefono escanea → imprime aqui)"
else
  echo "URL local (modo directo):"
  echo "  http://127.0.0.1:3000/health"
  echo "URLs en la misma red:"
  ifconfig | awk '/inet / && $2 !~ /^127/ {print "  http://" $2 ":3000/imprimir"}'
fi
echo
echo "Puedes cerrar esta ventana."
read "?Presiona Enter para cerrar."
