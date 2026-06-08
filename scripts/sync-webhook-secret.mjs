#!/usr/bin/env node
/**
 * Sync CLICKFUNNELS_WEBHOOK_SECRET from env into Organization.clickfunnelsSecret.
 * Run after rotating the secret in ClickFunnels + Vercel:
 *   npm run env:sync && npm run sync:webhook-secret
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    if (process.env[key]) continue;
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

const root = resolve(import.meta.dirname, "..");
loadEnvFile(resolve(root, ".env.local"));
loadEnvFile(resolve(root, ".env"));

const secret = process.env.CLICKFUNNELS_WEBHOOK_SECRET?.trim();
if (!secret) {
  console.error("Missing CLICKFUNNELS_WEBHOOK_SECRET in environment.");
  process.exit(1);
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error("Missing DATABASE_URL in environment.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const orgs = await prisma.organization.findMany({
    select: { id: true, slug: true, clickfunnelsSecret: true },
  });

  if (orgs.length === 0) {
    console.log("No organizations found.");
    process.exit(0);
  }

  for (const org of orgs) {
    const current = org.clickfunnelsSecret?.trim() || null;
    if (current === secret) {
      console.log(`[${org.slug}] already in sync`);
      continue;
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: { clickfunnelsSecret: secret },
    });
    console.log(`[${org.slug}] updated clickfunnelsSecret from env`);
  }

  console.log("Done.");
} finally {
  await prisma.$disconnect();
}
