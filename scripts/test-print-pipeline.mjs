#!/usr/bin/env node
/**
 * Prueba end-to-end: DB → PrintJob → API cola → (opcional) complete.
 * Uso: node scripts/test-print-pipeline.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const impresoraEnv = resolve(
  process.env.HOME,
  "Desktop/Impresora Auto/.env.local"
);

function loadEnv(path) {
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

loadEnv(resolve(root, ".env.local"));
loadEnv(impresoraEnv);

const BASE =
  process.env.APP_BASE_URL?.replace(/\/$/, "") ||
  "https://workshop-space-counter.vercel.app";
const PRINT_TOKEN = process.env.PRINT_AGENT_TOKEN?.trim();
const ADMIN_TOKEN = process.env.ADMIN_TOKEN?.trim();

function buildDbUrl() {
  const password = process.env.POSTGRES_PASSWORD?.trim();
  const supabase = process.env.SUPABASE_URL?.trim();
  if (!password || !supabase) return null;
  const m = supabase.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!m) return null;
  const ref = m[1];
  const region = process.env.SUPABASE_DB_REGION?.trim() || "us-east-1";
  const enc = encodeURIComponent(password);
  return `postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:5432/postgres?sslmode=require`;
}

async function httpJson(url, options = {}) {
  const res = await fetch(url, options);
  let body;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = { _raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

function log(step, ok, detail) {
  const mark = ok ? "OK" : "FAIL";
  console.log(`[${mark}] ${step}`);
  if (detail) console.log("      ", detail);
}

async function main() {
  console.log("=== Test pipeline impresión ===\n");
  console.log("BASE:", BASE);

  // --- HTTP sin DB ---
  const noAuth = await httpJson(`${BASE}/api/print/jobs/next`);
  log(
    "GET /api/print/jobs/next sin token → 401",
    noAuth.status === 401,
    `status ${noAuth.status}`
  );

  if (!PRINT_TOKEN) {
    log("PRINT_AGENT_TOKEN en .env", false, "Falta en Impresora Auto/.env.local");
  } else {
    const pollEmpty = await httpJson(`${BASE}/api/print/jobs/next`, {
      headers: { Authorization: `Bearer ${PRINT_TOKEN}` },
    });
    log(
      "GET /api/print/jobs/next con token",
      pollEmpty.status === 200,
      `status ${pollEmpty.status} job=${pollEmpty.body?.job === null ? "null" : "present"}`
    );
  }

  const dbUrl = buildDbUrl();
  if (!dbUrl) {
    log("Conexión DB", false, "POSTGRES_PASSWORD o SUPABASE_URL faltan");
    console.log("\nSin DB no se puede crear PrintJob de prueba.");
    process.exit(1);
  }

  process.env.POSTGRES_PRISMA_URL = dbUrl;
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    let jobCount = 0;
    try {
      jobCount = await prisma.printJob.count();
      log("Tabla PrintJob existe", true, `${jobCount} filas totales`);
    } catch (e) {
      log(
        "Tabla PrintJob existe",
        false,
        `${e.code || e.message} — EJECUTA docs/PRINT_QUEUE_SQL.md en Supabase`
      );
      await prisma.$disconnect();
      process.exit(1);
    }

    const reg = await prisma.registration.findFirst({
      where: { status: "CONFIRMED", pass: { isNot: null } },
      orderBy: { registeredAt: "desc" },
      include: {
        attendee: true,
        pass: true,
        workshopDate: { include: { workshop: true } },
        checkins: { take: 1 },
      },
    });

    if (!reg) {
      log("Registro con pase", false, "No hay registrations con pass");
      await prisma.$disconnect();
      process.exit(1);
    }

    const name =
      reg.attendeeName ?? reg.attendee.name ?? reg.attendeeEmail ?? reg.attendee.email;
    log("Registro de prueba", true, `${name} (${reg.id.slice(0, 8)}…)`);

    // Crear job manual vía API admin si hay token
    if (ADMIN_TOKEN) {
      const createViaApi = await httpJson(`${BASE}/api/admin/print-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: ADMIN_TOKEN,
          registrationId: reg.id,
        }),
      });
      log(
        "POST /api/admin/print-jobs",
        createViaApi.status === 200 && createViaApi.body?.ok,
        JSON.stringify(createViaApi.body)
      );
    } else {
      // Directo en DB
      const payload = {
        name,
        email: reg.attendeeEmail ?? reg.attendee.email,
        workshopLabel: reg.workshopDate.workshop.label,
        fontLarge: 160,
        fontSmall: 80,
        mediaSize: "3x2",
        showEmail: false,
        showWorkshop: false,
      };
      const job = await prisma.printJob.create({
        data: {
          registrationId: reg.id,
          trigger: "test_script",
          status: "PENDING",
          payload,
        },
      });
      log("PrintJob PENDING creado en DB", true, job.id);
    }

    if (PRINT_TOKEN) {
      const pollJob = await httpJson(`${BASE}/api/print/jobs/next`, {
        headers: { Authorization: `Bearer ${PRINT_TOKEN}` },
      });
      const hasJob = pollJob.body?.job?.id;
      log(
        "Poll: hay job para la impresora",
        pollJob.status === 200 && Boolean(hasJob),
        hasJob
          ? `jobId=${pollJob.body.job.id} name=${pollJob.body.job.payload?.name}`
          : JSON.stringify(pollJob.body)
      );

      if (hasJob) {
        const jobId = pollJob.body.job.id;
        const complete = await httpJson(
          `${BASE}/api/print/jobs/${jobId}/complete`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${PRINT_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ success: true }),
          }
        );
        log(
          "POST complete (simula impreso)",
          complete.status === 200 && complete.body?.ok,
          JSON.stringify(complete.body)
        );
      }
    }

    const pending = await prisma.printJob.count({
      where: { status: "PENDING" },
    });
    log("Jobs PENDING restantes", true, String(pending));

    console.log("\n=== Resumen ===");
    console.log(
      "Si PrintJob OK y poll devuelve job → la nube está bien.",
      "Si la Rollo no imprime → revisa Mac del evento (agente + lpstat -d)."
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
