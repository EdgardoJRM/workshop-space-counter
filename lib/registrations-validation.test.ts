import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateWorkshopDateOrganization } from "./registrations-validation";

describe("validateWorkshopDateOrganization", () => {
  it("accepts when organization matches workshop date org", () => {
    assert.deepEqual(
      validateWorkshopDateOrganization({
        organizationId: "org_a",
        workshopOrgId: "org_a",
      }),
      { ok: true }
    );
  });

  it("accepts when organizationId is omitted", () => {
    assert.deepEqual(
      validateWorkshopDateOrganization({
        workshopOrgId: "org_a",
      }),
      { ok: true }
    );
  });

  it("rejects when organization does not match workshop date org", () => {
    const result = validateWorkshopDateOrganization({
      organizationId: "org_a",
      workshopOrgId: "org_b",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "ORG_MISMATCH");
      assert.match(result.error, /organización/i);
    }
  });
});
