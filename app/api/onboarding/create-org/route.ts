import { NextResponse } from "next/server";
import { PlanTier } from "@prisma/client";
import { createOrganization } from "@/lib/organization";
import { isDatabaseConfigured } from "@/lib/prisma";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type Body = {
  businessName?: unknown;
  slug?: unknown;
  ownerEmail?: unknown;
  plan?: unknown;
};

function parsePlan(raw: unknown): PlanTier {
  if (raw === "EVENT_PRO") return PlanTier.EVENT_PRO;
  if (raw === "BUSINESS") return PlanTier.BUSINESS;
  return PlanTier.STARTER;
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const businessName =
    typeof body.businessName === "string" ? body.businessName.trim() : "";
  const slug =
    typeof body.slug === "string"
      ? body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-")
      : "";
  const ownerEmail =
    typeof body.ownerEmail === "string" ? body.ownerEmail.trim().toLowerCase() : "";
  const plan = parsePlan(body.plan);

  if (!businessName || !slug || !ownerEmail.includes("@")) {
    return NextResponse.json(
      { error: "businessName, slug, and ownerEmail are required" },
      { status: 400 }
    );
  }

  try {
    const org = await createOrganization({
      slug,
      name: businessName,
      ownerEmail,
      plan,
    });

    if (isStripeConfigured()) {
      const checkout = await createCheckoutSession({
        organizationId: org.id,
        organizationSlug: org.slug,
        ownerEmail,
        plan,
      });
      if ("url" in checkout) {
        return NextResponse.json({
          ok: true,
          organization: org,
          checkoutUrl: checkout.url,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      organization: org,
      message: "Cuenta creada. Configura Stripe para cobrar suscripciones.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create org";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
