#!/bin/zsh
# Empaqueta Impresora Auto para distribución (sin firma — añade codesign después).
set -e

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$APP_DIR/dist"
STAGE="$DIST/Hernandez Pass Printer"
DMG="$DIST/HernandezPassPrinter.dmg"

echo "Empaquetando desde: $APP_DIR"
rm -rf "$DIST"
mkdir -p "$STAGE"

rsync -a \
  --exclude venv \
  --exclude dist \
  --exclude __pycache__ \
  --exclude .env.local \
  "$APP_DIR/" "$STAGE/"

cp "$APP_DIR/.env.local.example" "$STAGE/.env.local.example" 2>/dev/null || true

cat > "$STAGE/LEEME.txt" <<TXT
Hernandez Pass Printer
======================

1. Conecta la Rollo (USB) y márcala predeterminada en macOS.
2. En admin web → Impresora → genera código de emparejamiento.
3. Terminal:
   cd "$(basename "$STAGE")"
   zsh emparejar.sh
   zsh instalar.sh

Logs: ~/Library/Logs/Impresora Auto/server.log
TXT

if command -v hdiutil >/dev/null 2>&1; then
  hdiutil create -volname "Hernandez Pass Printer" -srcfolder "$STAGE" -ov -format UDZO "$DMG"
  echo "LISTO: $DMG"
else
  echo "LISTO (carpeta): $STAGE"
  echo "Instala hdiutil para generar .dmg"
fi

echo ""
echo "Firma y notarización (Apple Developer ID):"
echo "  codesign --deep --force --sign \"Developer ID Application: ...\" \"$STAGE\""
echo "  xcrun notarytool submit \"$DMG\" --apple-id ... --team-id ... --password ..."
