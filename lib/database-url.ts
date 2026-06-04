/**
 * Construye URLs de Postgres cuando la integración Vercel↔Supabase
 * deja POSTGRES_PRISMA_URL vacío pero sí sincroniza HOST, USER, SUPABASE_URL, etc.
 */

function encodePassword(password: string): string {
  return encodeURIComponent(password);
}

function getProjectRef(): string | null {
  const url = process.env.SUPABASE_URL?.trim() ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return null;
  const m = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return m?.[1] ?? null;
}

function getPoolerRegion(): string {
  return (
    process.env.SUPABASE_DB_REGION?.trim() ||
    process.env.POSTGRES_REGION?.trim() ||
    "us-east-1"
  );
}

/** Conexión directa (migraciones, db push). */
export function buildDirectPostgresUrl(): string | null {
  const explicit = process.env.POSTGRES_URL_NON_POOLING?.trim();
  if (explicit) return explicit;

  const direct = process.env.POSTGRES_URL?.trim();
  if (direct && !direct.includes("pooler")) return direct;

  const password = process.env.POSTGRES_PASSWORD?.trim();
  const host = process.env.POSTGRES_HOST?.trim();
  const user = process.env.POSTGRES_USER?.trim() || "postgres";
  const database = process.env.POSTGRES_DATABASE?.trim() || "postgres";

  if (!password || !host) return null;

  return `postgresql://${user}:${encodePassword(password)}@${host}:5432/${database}?sslmode=require`;
}

/** Pooler para Prisma en runtime (Vercel). */
export function buildPooledPostgresUrl(): string | null {
  const explicit = process.env.POSTGRES_PRISMA_URL?.trim();
  if (explicit) return explicit;

  const password = process.env.POSTGRES_PASSWORD?.trim();
  const ref = getProjectRef();
  if (!password || !ref) return null;

  const region = getPoolerRegion();
  const base = `postgresql://postgres.${ref}:${encodePassword(password)}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
  if (base.includes("pgbouncer=true")) return base;
  return `${base}?pgbouncer=true&sslmode=require`;
}

export function resolveDatabaseUrls(): {
  pooled: string | null;
  direct: string | null;
} {
  return {
    pooled: buildPooledPostgresUrl(),
    direct: buildDirectPostgresUrl(),
  };
}

export function applyDatabaseUrlsToEnv(): boolean {
  const { pooled, direct } = resolveDatabaseUrls();
  if (!pooled || !direct) return false;
  process.env.POSTGRES_PRISMA_URL = pooled;
  process.env.POSTGRES_URL_NON_POOLING = direct;
  return true;
}

export function isDatabaseConfigured(): boolean {
  const { pooled } = resolveDatabaseUrls();
  return Boolean(pooled?.trim());
}
