#!/bin/zsh
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$APP_DIR/venv"
PYTHON_BIN="$VENV_DIR/bin/python"
PLIST_ID="com.edgardo.impresora-auto"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_ID}.plist"
LOG_DIR="$HOME/Library/Logs/Impresora Auto"

echo "Instalando en: $APP_DIR"

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: No hay python3. Instala Python 3 desde python.org"
  exit 1
fi

PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "Python: $PY_VER"

if ! command -v lpr >/dev/null 2>&1; then
  echo "ERROR: No hay lpr (impresoras). Revisa Ajustes del sistema."
  exit 1
fi

if [ ! -f "$APP_DIR/.env.local" ]; then
  echo "ERROR: Falta $APP_DIR/.env.local"
  echo "Copia .env.local.example y completa APP_BASE_URL y PRINT_AGENT_TOKEN"
  exit 1
fi

python3 -m venv "$VENV_DIR"
"$PYTHON_BIN" -m pip install --upgrade pip -q
"$PYTHON_BIN" -m pip install -r "$APP_DIR/requirements.txt" -q

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

/usr/bin/plutil -create xml1 "$PLIST_PATH" 2>/dev/null || rm -f "$PLIST_PATH"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_ID}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${PYTHON_BIN}</string>
    <string>-u</string>
    <string>${APP_DIR}/printer_watcher.py</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${APP_DIR}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/server.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/server-error.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)" "$PLIST_PATH" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH"

echo ""
echo "LISTO."
echo "Impresora predeterminada:"
lpstat -d 2>/dev/null || echo "(ninguna — conecta la Rollo)"
echo ""
echo "Logs: tail -f \"$LOG_DIR/server.log\""
