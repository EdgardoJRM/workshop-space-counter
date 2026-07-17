#!/bin/bash
cd "$(dirname "$0")/.."
echo "Iniciando relay de impresión Rollo (lp) en http://127.0.0.1:3927"
echo "Deja esta ventana abierta el día del evento."
node scripts/rollo-print-daemon.mjs
