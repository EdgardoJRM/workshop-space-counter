#!/bin/zsh
set -e
cd "$(dirname "$0")"

if [ ! -x "venv/bin/python" ]; then
  echo "Primero corre: zsh instalar.sh"
  read "?Enter para cerrar."
  exit 1
fi

echo "=== Diagnóstico Impresora Auto ==="
echo
venv/bin/python -u -c "
import os, sys
sys.path.insert(0, '.')
from cloud_agent import load_env_file, refresh_config, api_request

load_env_file()
refresh_config()
base = os.environ.get('APP_BASE_URL','')
print('APP_BASE_URL:', base)
print('Token configurado:', 'si' if os.environ.get('PRINT_AGENT_TOKEN') else 'NO')
print()
data = api_request('GET', '/api/print/jobs/next')
print('OK — API respondió. job =', data.get('job'))
"

echo
echo "Impresora predeterminada:"
lpstat -d 2>/dev/null || echo "(ninguna)"
echo
read "?Enter para cerrar."
