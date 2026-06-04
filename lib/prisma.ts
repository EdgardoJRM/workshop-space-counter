import { PrismaClient } from "@prisma/client";
import {
  buildDirectPostgresUrl,
  buildPooledPostgresUrl,
  isDatabaseConfigured,
} from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  // En Vercel: pooler (6543). Si falla el tenant del pooler, directo (5432).
  const url = buildPooledPostgresUrl() ?? buildDirectPostgresUrl();
  if (url) {
    return new PrismaClient({
      datasources: { db: { url } },
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { isDatabaseConfigured };
