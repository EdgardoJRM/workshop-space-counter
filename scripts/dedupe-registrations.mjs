/**
 * Find and remove duplicate CONFIRMED registrations (same email + workshop date).
 *
 * Usage:
 *   node scripts/dedupe-registrations.mjs --dry-run
 *   node scripts/dedupe-registrations.mjs --dry-run --workshop-date-id=cmr2r78bf...
 *   node scripts/dedupe-registrations.mjs --apply --workshop-date-id=cmr2r78bf...
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const APPLY = process.argv.includes("--apply");
const workshopDateIdArg = process.argv
  .find((a) => a.startsWith("--workshop-date-id="))
  ?.slice(18)
  ?.trim();

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

const { buildDirectPostgresUrl } = await import("../lib/database-url.ts");
const directUrl = buildDirectPostgresUrl();
if (!directUrl) {
  console.error("No DB URL");
  process.exit(1);
}
process.env.POSTGRES_PRISMA_URL = directUrl;
process.env.POSTGRES_URL_NON_POOLING = directUrl;

const { PrismaClient, RegistrationStatus } = await import("@prisma/client");
const prisma = new PrismaClient();

function regEmail(reg) {
  return (reg.attendeeEmail ?? reg.attendee?.email ?? "")
    .trim()
    .toLowerCase()
    .replace(/\u00a0/g, "");
}

function pickKeeper(regs) {
  const sorted = [...regs].sort((a, b) => {
    const aCheck = a.checkins?.length ? 1 : 0;
    const bCheck = b.checkins?.length ? 1 : 0;
    if (bCheck !== aCheck) return bCheck - aCheck;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  return { keeper: sorted[0], remove: sorted.slice(1) };
}

async function main() {
  console.log("Mode:", APPLY ? "APPLY" : "DRY-RUN");
  if (workshopDateIdArg) console.log("WorkshopDate filter:", workshopDateIdArg);

  const regs = await prisma.registration.findMany({
    where: {
      status: RegistrationStatus.CONFIRMED,
      ...(workshopDateIdArg ? { workshopDateId: workshopDateIdArg } : {}),
    },
    include: {
      attendee: true,
      checkins: true,
      workshopDate: { include: { workshop: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const byDateEmail = new Map();
  for (const reg of regs) {
    const email = regEmail(reg);
    if (!email) continue;
    const key = `${reg.workshopDateId}::${email}`;
    if (!byDateEmail.has(key)) byDateEmail.set(key, []);
    byDateEmail.get(key).push(reg);
  }

  const toDelete = [];
  for (const [, group] of byDateEmail) {
    if (group.length < 2) continue;
    const { keeper, remove } = pickKeeper(group);
    const wd = keeper.workshopDate;
    for (const r of remove) {
      toDelete.push({
        id: r.id,
        email: regEmail(r),
        name: r.attendeeName ?? r.attendee?.name ?? "",
        source: r.source ?? "—",
        workshop: wd.workshop.slug,
        workshopTitle: wd.title,
        workshopDateId: wd.id,
        hasCheckin: r.checkins.length > 0,
        keeperId: keeper.id,
        keeperSource: keeper.source ?? "—",
        keeperHasCheckin: keeper.checkins.length > 0,
      });
    }
  }

  if (toDelete.length === 0) {
    console.log("No duplicate CONFIRMED registrations found.");
    await prisma.$disconnect();
    return;
  }

  const byDate = new Map();
  for (const d of toDelete) {
    const k = `${d.workshopTitle} (${d.workshopDateId})`;
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k).push(d);
  }

  for (const [dateLabel, items] of byDate) {
    console.log(`\n--- ${dateLabel} ---`);
    for (const d of items) {
      console.log(
        `DELETE ${d.id} | ${d.name} <${d.email}> | source=${d.source} checkin=${d.hasCheckin}` +
          ` → keep ${d.keeperId} (source=${d.keeperSource}, checkin=${d.keeperHasCheckin})`
      );
    }
  }

  console.log(`\nTotal extras to delete: ${toDelete.length}`);

  if (!APPLY) {
    await prisma.$disconnect();
    return;
  }

  for (const d of toDelete) {
    await prisma.registration.delete({ where: { id: d.id } });
    console.log("Deleted", d.id, d.email);
  }

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
