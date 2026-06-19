import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clickFunnelsExternalOrderId,
  normalizeRegistrationEmail,
} from "./registrations";

describe("normalizeRegistrationEmail", () => {
  it("lowercases and trims email", () => {
    assert.equal(normalizeRegistrationEmail("  User@Example.COM  "), "user@example.com");
  });
});

describe("clickFunnelsExternalOrderId", () => {
  it("builds a stable id per workshop date and email", () => {
    assert.equal(
      clickFunnelsExternalOrderId("date-abc", "Buyer@Example.com"),
      "cf:date-abc:buyer@example.com"
    );
  });

  it("collapses different ClickFunnels order ids for the same buyer", () => {
    const email = "jane@example.com";
    const workshopDateId = "wd-123";
    const contactEventOrderId = clickFunnelsExternalOrderId(workshopDateId, email);
    const orderCompletedOrderId = clickFunnelsExternalOrderId(workshopDateId, email);

    assert.equal(contactEventOrderId, orderCompletedOrderId);
    assert.notEqual(contactEventOrderId, "236296209");
    assert.notEqual(orderCompletedOrderId, "22642");
  });
});
