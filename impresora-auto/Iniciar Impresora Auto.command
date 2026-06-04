#!/bin/zsh
set -e

cd "$(dirname "$0")"

if [ ! -x "venv/bin/python" ]; then
  echo "No encuentro el entorno instalado. Corriendo instalador primero..."
  ./Instalar\ -\ SOLO\ UNA\ VEZ.command
fi

echo "Iniciando Impresora Auto..."
echo
echo "URL local: http://127.0.0.1:3000/health"
echo "URLs para escanear desde otro equipo en la misma red:"
ifconfig | awk '/inet / && $2 !~ /^127/ {print "  http://" $2 ":3000/imprimir"}'
echo
echo "Deja esta ventana abierta mientras usas la impresora."
echo "Para detenerlo, presiona Ctrl+C."
echo

venv/bin/python app.py
