import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseClickFunnelsPayload } from "./clickfunnels";
import {
  AWAITING_WORKSHOP_MARKER,
  buildResolvedClickFunnelsPurchase,
  pendingPurchaseFromPayload,
} from "./pending-purchases";

describe("pending purchases helpers", () => {
  it("uses AWAITING_WORKSHOP marker constant", () => {
    assert.equal(AWAITING_WORKSHOP_MARKER, "AWAITING_WORKSHOP");
  });

  it("builds resolved purchase with assigned workshop slug", () => {
    const purchase = parseClickFunnelsPayload({
      event_type: "order.completed",
      event_id: "evt-pending",
      data: {
        id: 9001,
        funnel_name: "Funnel sin token",
        contact: { email_address: "pending@example.com", first_name: "Ana" },
      },
    });
    assert.ok(purchase);
    assert.equal(purchase.workshopSlug, null);

    const resolved = buildResolvedClickFunnelsPurchase(purchase, "duplica-ventas");
    assert.equal(resolved.workshopSlug, "duplica-ventas");
    assert.equal(resolved.email, "pending@example.com");
    assert.equal(resolved.externalOrderId, "9001");
  });

  it("summarizes pending purchase from webhook payload", () => {
    const createdAt = new Date("2026-06-01T12:00:00.000Z");
    const summary = pendingPurchaseFromPayload({
      id: "we_123",
      externalId: "9001",
      createdAt,
      payload: {
        event_type: "order.completed",
        event_id: "evt-pending",
        data: {
          id: 9001,
          funnel_name: "Ai Domination Bootcamp",
          contact: { email_address: "pending@example.com", first_name: "Ana" },
        },
      },
    });

    assert.ok(summary);
    assert.equal(summary.id, "we_123");
    assert.equal(summary.externalOrderId, "9001");
    assert.equal(summary.email, "pending@example.com");
    assert.equal(summary.name, "Ana");
    assert.equal(summary.funnelLabel, "Ai Domination Bootcamp");
    assert.equal(summary.ticketQuantity, 1);
    assert.equal(summary.createdAt, createdAt.toISOString());
  });

  it("returns null summary when payload has no email", () => {
    const summary = pendingPurchaseFromPayload({
      id: "we_bad",
      externalId: "bad",
      createdAt: new Date(),
      payload: { data: { id: 1 } },
    });
    assert.equal(summary, null);
  });
});
