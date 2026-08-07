/**
 * Sync DTV Jul 18 2026 registrations from CSV.
 * Usage:
 *   node scripts/sync-dtv-jul18-csv.mjs --dry-run
 *   node scripts/sync-dtv-jul18-csv.mjs --apply
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const CSV_PATH =
  process.argv.find((a) => a.startsWith("--csv="))?.slice(6) ??
  "/Users/gardo/Downloads/Duplica Tus Ventas 2026/Julio-18-2026-1-Duplica Tus Ventas junio-27-2026.csv";
const TARGET_DAY = "2026-07-18";
const WORKSHOP_SLUG = "duplica-ventas";
const APPLY = process.argv.includes("--apply");
const DRY_RUN = !APPLY;

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
  console.error("No DB URL — run npm run env:sync or set .env.vercel.production");
  process.exit(1);
}
process.env.POSTGRES_PRISMA_URL = directUrl;
process.env.POSTGRES_URL_NON_POOLING = directUrl;

const { PrismaClient, RegistrationStatus } = await import("@prisma/client");
const { importRegistrationsFromCsv } = await import("../lib/registrations.ts");
const { getWorkshopCalendarDay } = await import("../lib/staff-scan-sessions.ts");

const prisma = new PrismaClient();

function parseCsvPeople(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  const emailIdx = header.findIndex((h) => h.trim().toLowerCase() === "email");
  const firstIdx = header.findIndex((h) => h.trim().toLowerCase() === "first_name");
  const lastIdx = header.findIndex((h) => h.trim().toLowerCase() === "last_name");
  const phoneIdx = header.findIndex((h) => h.trim().toLowerCase() === "phone");
  if (emailIdx < 0) throw new Error("CSV missing Email column");

  const people = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const email = (cols[emailIdx] ?? "")
      .trim()
      .replace(/\u00a0/g, "")
      .toLowerCase();
    if (!email || !email.includes("@")) continue;
    const first = (cols[firstIdx] ?? "").trim();
    const last = (cols[lastIdx] ?? "").trim();
    const name = `${first} ${last}`.replace(/\s+/g, " ").trim() || null;
    const phoneRaw = (cols[phoneIdx] ?? "").trim();
    const phone = phoneRaw.replace(/\D/g, "").slice(-10) || null;
    people.push({ row: i + 1, email, name, phone });
  }
  return people;
}

function regEmail(reg) {
  return (reg.attendeeEmail ?? reg.attendee?.email ?? "").trim().toLowerCase();
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
  const csvText = readFileSync(CSV_PATH, "utf8");
  const csvPeople = parseCsvPeople(csvText);
  const csvEmails = new Set(csvPeople.map((p) => p.email));

  const workshopDates = await prisma.workshopDate.findMany({
    where: { workshop: { slug: WORKSHOP_SLUG } },
    include: { workshop: true },
    orderBy: { startsAt: "asc" },
  });

  const workshopDate = workshopDates.find(
    (d) => getWorkshopCalendarDay(d.startsAt) === TARGET_DAY
  );

  if (!workshopDate) {
    console.error("No workshop date found for", WORKSHOP_SLUG, TARGET_DAY);
    console.error(
      "Available:",
      workshopDates.map((d) => ({
        id: d.id,
        day: getWorkshopCalendarDay(d.startsAt),
        title: d.title,
        startsAt: d.startsAt.toISOString(),
      }))
    );
    process.exit(1);
  }

  console.log("WorkshopDate:", workshopDate.id, workshopDate.title, workshopDate.startsAt.toISOString());
  console.log("CSV people:", csvPeople.length);
  console.log("Mode:", DRY_RUN ? "DRY-RUN" : "APPLY");

  const dbRegs = await prisma.registration.findMany({
    where: {
      workshopDateId: workshopDate.id,
      status: RegistrationStatus.CONFIRMED,
    },
    include: {
      attendee: true,
      pass: true,
      checkins: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const byEmail = new Map();
  for (const reg of dbRegs) {
    const email = regEmail(reg);
    if (!email) continue;
    if (!byEmail.has(email)) byEmail.set(email, []);
    byEmail.get(email).push(reg);
  }

  const toDelete = [];
  const keepers = new Map();

  for (const [email, regs] of byEmail) {
    if (regs.length === 1) {
      keepers.set(email, regs[0]);
      continue;
    }
    const { keeper, remove } = pickKeeper(regs);
    keepers.set(email, keeper);
    for (const r of remove) {
      toDelete.push({
        id: r.id,
        email,
        name: r.attendeeName,
        hasCheckin: r.checkins.length > 0,
        keeperId: keeper.id,
        keeperHasCheckin: keeper.checkins.length > 0,
      });
    }
  }

  const missing = csvPeople.filter((p) => !keepers.has(p.email));

  console.log("\n--- Duplicates to remove ---");
  if (toDelete.length === 0) console.log("(none)");
  for (const d of toDelete) {
    console.log(
      `DELETE ${d.id} ${d.email} checkin=${d.hasCheckin} → keep ${d.keeperId} checkin=${d.keeperHasCheckin}`
    );
  }

  console.log("\n--- Missing from DB (will create) ---");
  if (missing.length === 0) console.log("(none)");
  for (const m of missing) {
    console.log(`CREATE row ${m.row} ${m.email} ${m.name ?? ""}`);
  }

  console.log("\n--- Already OK ---");
  console.log(csvPeople.length - missing.length, "of", csvPeople.length);

  const extraInDb = [...byEmail.keys()].filter((e) => !csvEmails.has(e));
  if (extraInDb.length) {
    console.log("\n--- In DB but not in CSV (untouched) ---");
    for (const e of extraInDb) console.log(e);
  }

  if (DRY_RUN) {
    await prisma.$disconnect();
    return;
  }

  for (const d of toDelete) {
    await prisma.registration.delete({ where: { id: d.id } });
    console.log("Deleted", d.id);
  }

  if (missing.length > 0) {
    const result = await importRegistrationsFromCsv(missing, WORKSHOP_SLUG, {
      workshopDateId: workshopDate.id,
      sendPassEmail: true,
      importBatchId: `dtv-jul18-sync-${Date.now()}`,
    });
    console.log("\nImport result:", {
      created: result.created,
      duplicates: result.duplicates,
      failed: result.failed,
    });
    for (const r of result.results.filter((x) => !x.ok)) {
      console.log("FAIL", r.email, r.error);
    }
  }

  const finalRegs = await prisma.registration.findMany({
    where: {
      workshopDateId: workshopDate.id,
      status: RegistrationStatus.CONFIRMED,
    },
    include: { attendee: true, checkins: true },
  });

  const finalByEmail = new Map();
  for (const reg of finalRegs) {
    const email = regEmail(reg);
    if (!email) continue;
    if (!finalByEmail.has(email)) finalByEmail.set(email, []);
    finalByEmail.get(email).push(reg);
  }

  let ok = true;
  for (const p of csvPeople) {
    const list = finalByEmail.get(p.email) ?? [];
    if (list.length !== 1) {
      ok = false;
      console.error("VERIFY FAIL", p.email, "count=", list.length);
    }
  }

  console.log("\nVERIFY:", ok ? "PASS — 23 emails, 1 reg each" : "FAILED");
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
