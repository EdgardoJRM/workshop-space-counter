import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const CSV =
  process.argv.find((a) => a.startsWith("--csv="))?.slice(6) ??
  "/Users/gardo/Downloads/Duplica Tus Ventas 2026/Julio-18-2026-1-Duplica Tus Ventas junio-27-2026.csv";
const WD = "cmr2r78bf000e7km3vqof3c7w";

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
const url = buildDirectPostgresUrl();
process.env.POSTGRES_PRISMA_URL = url;
process.env.POSTGRES_URL_NON_POOLING = url;

const { PrismaClient, RegistrationStatus } = await import("@prisma/client");
const prisma = new PrismaClient();

function parseCsvEmails(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  const emailIdx = header.findIndex((h) => h.trim().toLowerCase() === "email");
  const emails = new Set();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const email = (cols[emailIdx] ?? "")
      .trim()
      .replace(/\u00a0/g, "")
      .toLowerCase();
    if (email.includes("@")) emails.add(email);
  }
  return emails;
}

const csvEmails = parseCsvEmails(readFileSync(CSV, "utf8"));
const regs = await prisma.registration.findMany({
  where: { workshopDateId: WD, status: RegistrationStatus.CONFIRMED },
  include: { attendee: true, checkins: true },
  orderBy: { attendeeName: "asc" },
});

const extra = [];
for (const r of regs) {
  const email = (r.attendeeEmail ?? r.attendee.email ?? "").trim().toLowerCase();
  if (!csvEmails.has(email)) {
    extra.push({
      name: r.attendeeName ?? r.attendee.name ?? "(sin nombre)",
      email,
      checkin: r.checkins.length > 0 ? "sí" : "no",
      source: r.source ?? "—",
    });
  }
}

for (const p of extra) {
  console.log(`${p.name} | ${p.email} | check-in: ${p.checkin} | source: ${p.source}`);
}
console.log(`\n${extra.length} persona(s) en DB del 18-Jul que no están en tu CSV (${regs.length} total CONFIRMED, ${csvEmails.size} en CSV).`);

await prisma.$disconnect();
