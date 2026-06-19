/**
 * Elimina registros duplicados (mismo email + fecha de taller).
 *
 * Uso:
 *   npm run env:sync   # si hace falta
 *   node scripts/remove-duplicate-registrations.mjs --dry-run
 *   node scripts/remove-duplicate-registrations.mjs --apply
 *   node scripts/remove-duplicate-registrations.mjs --apply --limit=3
 */
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

const { applyDatabaseUrlsToEnv } = await import("../lib/database-url.ts");
if (!applyDatabaseUrlsToEnv()) {
  console.error("No hay DATABASE_URL. Ejecuta npm run env:sync y define POSTGRES_PASSWORD.");
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = !args.includes("--apply");
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const maxRemovals = limitArg ? Number.parseInt(limitArg.split("=")[1] ?? "", 10) : undefined;
const orgArg = args.find((arg) => arg.startsWith("--org="));
const orgSlug = orgArg?.split("=")[1]?.trim() || "hernandez";

const { prisma } = await import("../lib/prisma.ts");
const { removeDuplicateRegistrations, findDuplicateRegistrationGroups } = await import(
  "../lib/registration-dedup.ts"
);

const org = await prisma.organization.findFirst({
  where: { slug: orgSlug },
  select: { id: true, slug: true },
});
if (!org) {
  console.error(`Organización no encontrada: ${orgSlug}`);
  process.exit(1);
}

const preview = await findDuplicateRegistrationGroups(org.id);
if (preview.length === 0) {
  console.log(`[${org.slug}] No hay duplicados por email + fecha.`);
  process.exit(0);
}

console.log(`[${org.slug}] Grupos duplicados encontrados: ${preview.length}`);
for (const group of preview) {
  console.log(
    `- ${group.email} (${group.workshopDateId}) → conservar ${group.keep.id}, borrar ${group.remove.map((r) => r.id).join(", ")}`
  );
}

const result = await removeDuplicateRegistrations({
  organizationId: org.id,
  dryRun,
  maxRemovals: Number.isFinite(maxRemovals) ? maxRemovals : undefined,
});

console.log(
  dryRun
    ? `[dry-run] Se borrarían ${result.removedIds.length} registro(s): ${result.removedIds.join(", ") || "(ninguno)"}`
    : `[apply] Borrados ${result.removedIds.length} registro(s): ${result.removedIds.join(", ") || "(ninguno)"}`
);
console.log(`Conservados: ${result.keptIds.join(", ") || "(ninguno)"}`);
console.log("soldCount ajustado:", result.soldCountAdjusted);

await prisma.$disconnect();
