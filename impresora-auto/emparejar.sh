#!/bin/zsh
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$APP_DIR/.env.local"
BASE_DEFAULT="https://workshop-space-counter.vercel.app"

echo "=== Emparejar Impresora Auto (SaaS) ==="
echo

read "APP_URL?URL de Hernandez Pass [$BASE_DEFAULT]: "
APP_BASE_URL="${APP_URL:-$BASE_DEFAULT}"
APP_BASE_URL="${APP_BASE_URL%/}"

read "PAIR_CODE?Código de 8 caracteres (desde Admin → Impresora): "
PAIR_CODE="${PAIR_CODE// /}"
PAIR_CODE="${PAIR_CODE^^}"

if [ -z "$PAIR_CODE" ]; then
  echo "ERROR: Falta el código."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: Necesitas curl."
  exit 1
fi

RESP=$(curl -sS -X POST "${APP_BASE_URL}/api/print/pair" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"${PAIR_CODE}\",\"name\":\"Mac evento\"}")

if ! echo "$RESP" | grep -q '"ok":true'; then
  echo "ERROR al emparejar:"
  echo "$RESP"
  exit 1
fi

TOKEN=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('agentToken',''))")
if [ -z "$TOKEN" ]; then
  echo "ERROR: No se recibió agentToken."
  exit 1
fi

cat > "$ENV_FILE" <<ENV
APP_BASE_URL=${APP_BASE_URL}
PRINT_AGENT_TOKEN=${TOKEN}
ENV

echo ""
echo "LISTO. Guardado en .env.local"
echo "Siguiente: zsh instalar.sh"
echo ""
