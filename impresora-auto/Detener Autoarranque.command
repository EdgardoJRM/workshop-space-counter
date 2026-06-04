#!/bin/zsh
set -e

PLIST_ID="com.edgardo.impresora-auto"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_ID.plist"

echo "Deteniendo autoarranque de Impresora Auto..."
launchctl bootout "gui/$(id -u)" "$PLIST_PATH" >/dev/null 2>&1 || true

echo "Autoarranque detenido."
echo "El archivo de configuracion queda en:"
echo "$PLIST_PATH"
echo
read "?Presiona Enter para cerrar."
