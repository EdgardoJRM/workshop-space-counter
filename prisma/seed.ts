import { PrismaClient } from "@prisma/client";
import { buildDirectPostgresUrl } from "../lib/database-url";
import { ensureDefaultOrganization } from "../lib/organization";
import { WORKSHOPS } from "../lib/workshop-keys";

const directUrl = buildDirectPostgresUrl();
const prisma = directUrl
  ? new PrismaClient({ datasources: { db: { url: directUrl } } })
  : new PrismaClient();

const DEFAULT_CAPACITIES: Record<string, number> = {
  "duplica-ventas": 25,
  canva: 10,
  "oferta-webinar": 25,
};

async function main() {
  const org = await ensureDefaultOrganization();

  for (const meta of Object.values(WORKSHOPS)) {
    const workshop = await prisma.workshop.upsert({
      where: {
        organizationId_slug: {
          organizationId: org.id,
          slug: meta.slug,
        },
      },
      create: {
        organizationId: org.id,
        slug: meta.slug,
        label: meta.label,
        active: true,
      },
      update: {
        label: meta.label,
        active: true,
      },
    });

    const existingActive = await prisma.workshopDate.findFirst({
      where: { workshopId: workshop.id, isActive: true },
    });

    if (!existingActive) {
      const startsAt = new Date();
      startsAt.setDate(startsAt.getDate() + 14);
      startsAt.setHours(10, 0, 0, 0);

      await prisma.workshopDate.create({
        data: {
          workshopId: workshop.id,
          title: `${meta.label} — próxima fecha`,
          startsAt,
          capacity: DEFAULT_CAPACITIES[meta.slug] ?? 25,
          soldCount: 0,
          isActive: true,
        },
      });
    }
  }

  console.log(`Seed complete: org=${org.slug}, workshops and dates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
