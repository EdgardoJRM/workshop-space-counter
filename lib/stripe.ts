import { PlanTier } from "@prisma/client";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY?.trim();

export type SaasPlan = {
  tier: PlanTier;
  name: string;
  priceId: string | null;
  monthlyUsd: number;
};

export const SAAS_PLANS: SaasPlan[] = [
  {
    tier: PlanTier.STARTER,
    name: "Starter",
    priceId: process.env.STRIPE_PRICE_STARTER?.trim() || null,
    monthlyUsd: 49,
  },
  {
    tier: PlanTier.EVENT_PRO,
    name: "Event Pro",
    priceId: process.env.STRIPE_PRICE_EVENT_PRO?.trim() || null,
    monthlyUsd: 99,
  },
  {
    tier: PlanTier.BUSINESS,
    name: "Business",
    priceId: process.env.STRIPE_PRICE_BUSINESS?.trim() || null,
    monthlyUsd: 199,
  },
];

export function isStripeConfigured(): boolean {
  return Boolean(STRIPE_SECRET);
}

export async function createCheckoutSession(input: {
  organizationId: string;
  organizationSlug: string;
  ownerEmail: string;
  plan: PlanTier;
  customerId?: string | null;
}): Promise<{ url: string } | { error: string }> {
  if (!STRIPE_SECRET) {
    return { error: "STRIPE_SECRET_KEY is not configured" };
  }

  const planDef = SAAS_PLANS.find((p) => p.tier === input.plan);
  if (!planDef?.priceId) {
    return { error: `Stripe price not configured for plan ${input.plan}` };
  }

  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) return { error: "APP_BASE_URL is not configured" };

  const params = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": planDef.priceId,
    "line_items[0][quantity]": "1",
    success_url: `${base}/onboarding/success?org=${encodeURIComponent(input.organizationSlug)}`,
    cancel_url: `${base}/pricing`,
    customer_email: input.ownerEmail,
    "metadata[organizationId]": input.organizationId,
    "metadata[organizationSlug]": input.organizationSlug,
    "metadata[plan]": input.plan,
    "subscription_data[metadata][organizationId]": input.organizationId,
  });

  if (input.customerId) {
    params.delete("customer_email");
    params.set("customer", input.customerId);
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok) {
    return { error: data.error?.message ?? "Stripe checkout failed" };
  }
  if (!data.url) return { error: "No checkout URL returned" };
  return { url: data.url };
}
