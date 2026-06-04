/**
 * Descarga variables de Production desde Vercel y las fusiona en .env.local
 * sin borrar UPSTASH / ADMIN_TOKEN.
 *
 * Uso: npm run env:sync
 */
import { spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");
const productionFile = resolve(root, ".env.vercel.production");
const localFile = resolve(root, ".env.local");

function parseEnv(content) {
  const map = new Map();
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    map.set(key, val);
  }
  return map;
}

function serializeEnv(map, header) {
  const lines = [header, ""];
  for (const [k, v] of map) {
    if (v.includes(" ") || v.includes("#")) {
      lines.push(`${k}="${v.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${k}=${v}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

console.log("Descargando variables de Production desde Vercel…\n");

const pull = spawnSync(
  "vercel",
  ["env", "pull", productionFile, "--environment=production", "--yes"],
  { stdio: "inherit", cwd: root }
);

if (pull.status !== 0) {
  process.exit(pull.status ?? 1);
}

const prod = parseEnv(readFileSync(productionFile, "utf8"));
const local = existsSync(localFile)
  ? parseEnv(readFileSync(localFile, "utf8"))
  : new Map();

/** Claves que queremos de Production (Supabase + app). */
const MERGE_KEYS = [
  "POSTGRES_HOST",
  "POSTGRES_USER",
  "POSTGRES_DATABASE",
  "POSTGRES_PASSWORD",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "APP_BASE_URL",
  "AUTH_JWT_SECRET",
  "ADMIN_EMAILS",
  "STAFF_EMAILS",
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "EMAIL_FROM",
  "CLICKFUNNELS_WEBHOOK_SECRET",
];

for (const key of MERGE_KEYS) {
  if (prod.has(key)) {
    const val = prod.get(key) ?? "";
    if (val !== "" || !local.has(key)) {
      local.set(key, val);
    }
  }
}

writeFileSync(
  localFile,
  serializeEnv(
    local,
    "# Fusionado por npm run env:sync (Production en Vercel + tus valores locales)"
  ),
  "utf8"
);

console.log("\n✓ Actualizado .env.local\n");

const missing = [];
if (!local.get("POSTGRES_PASSWORD")?.trim()) {
  missing.push("POSTGRES_PASSWORD");
}
if (!local.get("POSTGRES_HOST")?.trim() && !local.get("SUPABASE_URL")?.trim()) {
  missing.push("POSTGRES_HOST o SUPABASE_URL");
}

if (missing.length) {
  console.log("⚠ En Vercel siguen VACÍOS (el pull no puede inventarlos):");
  for (const m of missing) console.log(`   - ${m}`);
  console.log(`
Pon solo esto en Vercel → Settings → Environment Variables → Production:

  POSTGRES_PASSWORD = contraseña de Supabase → Settings → Database

Luego vuelve a ejecutar:  npm run env:sync

Y crea tablas:  npm run db:setup
`);
} else {
  console.log("POSTGRES_PASSWORD presente. Siguiente paso:\n  npm run db:setup\n");
}
