#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
echo "Iniciando relay de impresión Rollo (lp) en http://127.0.0.1:3927"
echo "Deja esta ventana abierta el día del evento."
if ! command -v python3 >/dev/null 2>&1; then
  echo ""
  echo "ERROR: python3 no está instalado en esta Mac."
  echo "macOS debería traerlo; si no, instala desde python.org"
  read -r -p "Enter para cerrar..."
  exit 1
fi
python3 "$DIR/rollo-print-daemon.py"
