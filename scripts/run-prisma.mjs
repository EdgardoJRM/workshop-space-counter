/**
 * Carga .env.local (+ opcional .env.vercel.production), arma URLs desde
 * POSTGRES_PASSWORD + vars de la integración, y ejecuta Prisma CLI.
 *
 * Uso: node scripts/run-prisma.mjs db push
 */
import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
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
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(resolve(root, ".env.vercel.production"));
loadEnvFile(resolve(root, ".env.local"));

const { buildDirectPostgresUrl, buildPooledPostgresUrl } = await import(
  "../lib/database-url.ts"
);

const direct = buildDirectPostgresUrl();
const pooled = buildPooledPostgresUrl();

if (!direct) {
  console.error(`
No se pudo armar la conexión a Postgres.

La integración Vercel↔Supabase suele dejar POSTGRES_PRISMA_URL vacío.
Solo necesitas UNA variable en Vercel (y en .env.local para comandos locales):

  POSTGRES_PASSWORD=<contraseña de Database en Supabase Dashboard>

Opcional si el pooler no es us-east-1:
  SUPABASE_DB_REGION=sa-east-1

Luego:
  npm run env:pull:production
  (copia POSTGRES_PASSWORD a .env.local si no viene en el pull)
  npm run db:push
`);
  process.exit(1);
}

// CLI (push, seed, migrate): conexión directa — la misma que ya funcionó en db push.
process.env.POSTGRES_PRISMA_URL = direct;
process.env.POSTGRES_URL_NON_POOLING = direct;

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Uso: node scripts/run-prisma.mjs <comando prisma>...");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", ...args], {
  stdio: "inherit",
  env: process.env,
  cwd: root,
});

process.exit(result.status ?? 1);
