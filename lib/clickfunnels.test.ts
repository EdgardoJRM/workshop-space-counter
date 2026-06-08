import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import {
  diagnoseWebhookAuthFailure,
  guestExternalOrderId,
  parseClickFunnelsPayload,
  parseClickFunnelsTicketQuantity,
  verifyClickFunnelsSignature,
} from "./clickfunnels";

describe("parseClickFunnelsPayload", () => {
  it("parses V2 contact.identified with email_address", () => {
    const result = parseClickFunnelsPayload({
      event_type: "contact.identified",
      event_id: "evt-contact-001",
      data: {
        id: 236296209,
        public_id: "BbBNRxw",
        first_name: "Bob",
        last_name: "Dullan",
        email_address: "bob@example.com",
        phone_number: "+18472555555",
      },
    });

    assert.ok(result);
    assert.equal(result.email, "bob@example.com");
    assert.equal(result.name, "Bob Dullan");
    assert.equal(result.phone, "+18472555555");
    assert.equal(result.externalOrderId, "236296209");
  });

  it("parses V2 order.completed with nested contact", () => {
    const result = parseClickFunnelsPayload({
      event_type: "order.completed",
      event_id: "evt-order-001",
      data: {
        id: 22642,
        public_id: "JmRRyN",
        contact: {
          email_address: "jane.doe@example.com",
          first_name: "Jane",
          last_name: "Doe",
          phone_number: "+19053871234",
        },
      },
    });

    assert.ok(result);
    assert.equal(result.email, "jane.doe@example.com");
    assert.equal(result.name, "Jane Doe");
    assert.equal(result.externalOrderId, "22642");
  });

  it("parses primary_contact when contact is absent", () => {
    const result = parseClickFunnelsPayload({
      event_type: "appointments/scheduled_event.created",
      event_id: "evt-appt-001",
      data: {
        id: 12345,
        primary_contact: {
          email_address: "john@snow.com",
          first_name: "John",
          last_name: "Snow",
        },
      },
    });

    assert.ok(result);
    assert.equal(result.email, "john@snow.com");
    assert.equal(result.name, "John Snow");
    assert.equal(result.externalOrderId, "12345");
  });

  it("uses event_id as externalOrderId fallback", () => {
    const result = parseClickFunnelsPayload({
      event_type: "contact.identified",
      event_id: "stable-event-id-xyz",
      data: {
        email_address: "no-id@example.com",
      },
    });

    assert.ok(result);
    assert.equal(result.externalOrderId, "stable-event-id-xyz");
  });

  it("returns null when email is missing", () => {
    assert.equal(
      parseClickFunnelsPayload({ event_type: "order.created", data: { id: 1 } }),
      null
    );
  });

  it("infers canva from funnel_name vcanva", () => {
    const result = parseClickFunnelsPayload({
      event_type: "order.completed",
      event_id: "evt-1",
      data: {
        id: 100,
        funnel_name: "Registro vcanva Marzo 2026",
        contact: { email_address: "a@b.com" },
      },
    });
    assert.ok(result);
    assert.equal(result.workshopSlug, "canva");
  });

  it("infers duplica-ventas from funnel.name vdtv", () => {
    const result = parseClickFunnelsPayload({
      event_type: "order.completed",
      event_id: "evt-2",
      funnel: { id: 1, name: "Funnel vdtv Retargeting" },
      data: {
        id: 101,
        contact: { email_address: "b@c.com" },
      },
    });
    assert.ok(result);
    assert.equal(result.workshopSlug, "duplica-ventas");
  });

  it("parses ticketQuantity from line_items", () => {
    const result = parseClickFunnelsPayload({
      event_type: "order.completed",
      event_id: "evt-qty",
      data: {
        id: 5795451,
        line_items: [
          { quantity: 2, original_product: { name: "Emerald Mentoring Program" } },
        ],
        contact: { email_address: "buyer@example.com", first_name: "Ed" },
      },
    });
    assert.ok(result);
    assert.equal(result.ticketQuantity, 2);
  });

  it("defaults ticketQuantity to 1 when line_items missing", () => {
    const result = parseClickFunnelsPayload({
      event_type: "order.completed",
      event_id: "evt-qty-1",
      data: {
        id: 1,
        contact: { email_address: "a@b.com" },
      },
    });
    assert.ok(result);
    assert.equal(result.ticketQuantity, 1);
  });

  it("leaves workshop null when funnel has no known token", () => {
    const result = parseClickFunnelsPayload({
      event_type: "order.completed",
      event_id: "evt-3",
      data: {
        id: 102,
        funnel_name: "Ai Domination Bootcampr",
        page_name: "AI Domination Bootcamp Webinar",
        contact: { email_address: "c@d.com" },
      },
    });
    assert.ok(result);
    assert.equal(result.workshopSlug, null);
  });
});

describe("parseClickFunnelsTicketQuantity", () => {
  it("sums multiple line item quantities", () => {
    assert.equal(
      parseClickFunnelsTicketQuantity({
        data: {
          line_items: [{ quantity: 1 }, { quantity: 2 }],
        },
      }),
      3
    );
  });

  it("returns 1 when no valid quantities", () => {
    assert.equal(parseClickFunnelsTicketQuantity({ data: {} }), 1);
  });
});

describe("guestExternalOrderId", () => {
  it("builds stable guest order ids", () => {
    assert.equal(guestExternalOrderId("5795451", 1), "5795451:guest:1");
    assert.equal(guestExternalOrderId("5795451", 2), "5795451:guest:2");
  });
});

describe("verifyClickFunnelsSignature", () => {
  it("accepts a valid HMAC signature", () => {
    const secret = "test-webhook-secret";
    const rawBody = JSON.stringify({ email: "a@b.com" });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    assert.equal(
      verifyClickFunnelsSignature(rawBody, signature, timestamp, secret),
      true
    );
  });

  it("rejects an invalid signature", () => {
    const rawBody = JSON.stringify({ email: "a@b.com" });
    const timestamp = String(Math.floor(Date.now() / 1000));

    assert.equal(
      verifyClickFunnelsSignature(rawBody, "bad-signature", timestamp, "secret"),
      false
    );
  });
});

describe("diagnoseWebhookAuthFailure", () => {
  it("reports signature_mismatch for wrong secret with CF headers", () => {
    const secret = "correct-secret";
    const rawBody = '{"id":1}';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", "other-secret")
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    const request = new Request("https://example.com/api/webhooks/clickfunnels", {
      method: "POST",
      headers: {
        "x-webhook-clickfunnels-signature": signature,
        "x-webhook-clickfunnels-timestamp": timestamp,
      },
      body: rawBody,
    });

    const diagnosis = diagnoseWebhookAuthFailure(request, secret, rawBody);
    assert.equal(diagnosis.reason, "signature_mismatch");
    assert.equal(diagnosis.hasCfSignature, true);
    assert.equal(diagnosis.hasCfTimestamp, true);
  });

  it("reports legacy_secret_mismatch without CF headers", () => {
    const request = new Request("https://example.com/api/webhooks/clickfunnels", {
      method: "POST",
      headers: { "x-webhook-secret": "wrong" },
      body: "{}",
    });

    const diagnosis = diagnoseWebhookAuthFailure(request, "right", "{}");
    assert.equal(diagnosis.reason, "legacy_secret_mismatch");
  });
});
