#!/usr/bin/env node
/**
 * Builds the downloadable Mac bundle for the print station page.
 * Output: public/downloads/Rollo-Print-Relay-mac.zip
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const staging = join(root, "public/downloads/rollo-print");
const zipPath = join(root, "public/downloads/Rollo-Print-Relay-mac.zip");

const command = `#!/bin/bash
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
`;

const readme = `Hernandez Pass — Relay Rollo (Mac)
================================

1. Descomprime esta carpeta en el Escritorio.
2. Doble clic en "Iniciar-Rollo.command"
   (si macOS lo bloquea: clic derecho → Abrir).
3. Deja la ventana de Terminal abierta todo el evento.
4. En Chrome, abre la estación de impresión y pulsa "Probar label".

La Rollo debe ser la impresora predeterminada (3×2″).
Cuando funciona, la estación muestra: "Impresión local activa (lp)".
`;

mkdirSync(staging, { recursive: true });
copyFileSync(
  join(root, "scripts/rollo-print-daemon.py"),
  join(staging, "rollo-print-daemon.py")
);
writeFileSync(join(staging, "Iniciar-Rollo.command"), command, { mode: 0o755 });
writeFileSync(join(staging, "LEEME.txt"), readme, "utf8");

execFileSync("zip", ["-j", "-q", zipPath, "rollo-print-daemon.py", "Iniciar-Rollo.command", "LEEME.txt"], {
  cwd: staging,
});

const zipBytes = readFileSync(zipPath).length;
console.log(`Packed ${zipPath} (${zipBytes} bytes)`);
