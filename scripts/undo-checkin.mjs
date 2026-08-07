/**
 * Undo check-in for a registration (DTV Jul 18 helper).
 * Usage:
 *   node scripts/undo-checkin.mjs --email=bigautodealer@gmail.com --dry-run
 *   node scripts/undo-checkin.mjs --email=bigautodealer@gmail.com --apply
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const APPLY = process.argv.includes("--apply");
const emailArg = process.argv.find((a) => a.startsWith("--email="))?.slice(8)?.trim().toLowerCase();
const regArg = process.argv.find((a) => a.startsWith("--registration-id="))?.slice(17)?.trim();

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

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

function regEmail(reg) {
  return (reg.attendeeEmail ?? reg.attendee?.email ?? "").trim().toLowerCase();
}

async function main() {
  if (!emailArg && !regArg) {
    console.error("Provide --email= or --registration-id=");
    process.exit(1);
  }

  const reg = await prisma.registration.findFirst({
    where: regArg
      ? { id: regArg }
      : {
          OR: [
            { attendeeEmail: emailArg },
            { attendee: { email: emailArg } },
          ],
        },
    include: {
      attendee: true,
      workshopDate: { include: { workshop: true } },
      checkins: { include: { printJob: true } },
    },
  });

  if (!reg) {
    console.error("Registration not found");
    process.exit(1);
  }

  const checkin = reg.checkins[0];
  if (!checkin) {
    console.log("Already no check-in:", reg.id, regEmail(reg));
    await prisma.$disconnect();
    return;
  }

  console.log({
    mode: APPLY ? "APPLY" : "DRY-RUN",
    registrationId: reg.id,
    email: regEmail(reg),
    name: reg.attendeeName ?? reg.attendee.name,
    workshop: reg.workshopDate.workshop.slug,
    workshopDateId: reg.workshopDateId,
    checkinId: checkin.id,
    checkedInAt: checkin.createdAt.toISOString(),
    printJob: checkin.printJob
      ? { id: checkin.printJob.id, status: checkin.printJob.status }
      : null,
  });

  if (!APPLY) {
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.checkin.delete({ where: { id: checkin.id } });
    await tx.workshopDate.update({
      where: { id: reg.workshopDateId },
      data: { checkedInCount: { decrement: 1 } },
    });
  });

  console.log("Check-in removed for", regEmail(reg));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
