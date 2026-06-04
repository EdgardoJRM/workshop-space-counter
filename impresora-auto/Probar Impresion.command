#!/bin/zsh
set -e

NAME="${1:-Prueba Impresora}"

echo "Enviando prueba a http://127.0.0.1:3000/imprimir"
curl -sS -X POST "http://127.0.0.1:3000/imprimir" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$NAME\",\"email\":\"prueba@example.com\"}"
echo
echo
read "?Presiona Enter para cerrar."
