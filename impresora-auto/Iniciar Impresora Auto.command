#!/bin/zsh
set -e

cd "$(dirname "$0")"

if [ ! -x "venv/bin/python" ]; then
  echo "No encuentro el entorno instalado. Corriendo instalador primero..."
  ./Instalar\ -\ SOLO\ UNA\ VEZ.command
fi

echo "Iniciando Impresora Auto (watcher + cola en la nube)..."
echo
echo "Deja esta ventana abierta. Veras mensajes de conexion y de cada etiqueta."
echo "Logs persistentes: ~/Library/Logs/Impresora Auto/server.log"
echo

exec venv/bin/python -u printer_watcher.py
