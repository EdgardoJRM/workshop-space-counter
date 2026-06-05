import { NextResponse } from "next/server";
import { PlanTier } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parsePlan(raw: string | undefined): PlanTier {
  if (raw === "EVENT_PRO") return PlanTier.EVENT_PRO;
  if (raw === "BUSINESS") return PlanTier.BUSINESS;
  return PlanTier.STARTER;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret || !isDatabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: {
    type: string;
    data: {
      object: {
        metadata?: Record<string, string>;
        customer?: string;
        subscription?: string;
        status?: string;
      };
    };
  };

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
      apiVersion: "2025-02-24.acacia",
    });
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    ) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const obj = event.data.object;
  const organizationId = obj.metadata?.organizationId;

  if (
    organizationId &&
    (event.type === "checkout.session.completed" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created")
  ) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        stripeCustomerId: typeof obj.customer === "string" ? obj.customer : undefined,
        stripeSubscriptionId:
          typeof obj.subscription === "string" ? obj.subscription : undefined,
        subscriptionStatus: obj.status ?? "active",
        plan: parsePlan(obj.metadata?.plan),
      },
    });
  }

  return NextResponse.json({ received: true });
}
