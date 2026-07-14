import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeCheckinToken,
  validateExpectedWorkshopDate,
} from "./checkin-validation";

describe("normalizeCheckinToken", () => {
  it("strips hp: prefix", () => {
    assert.equal(normalizeCheckinToken("hp:abc123"), "abc123");
  });

  it("trims whitespace", () => {
    assert.equal(normalizeCheckinToken("  token  "), "token");
  });

  it("keeps raw token unchanged", () => {
    assert.equal(normalizeCheckinToken("raw-token"), "raw-token");
  });
});

describe("validateExpectedWorkshopDate", () => {
  it("accepts when expected date matches pass date", () => {
    assert.deepEqual(
      validateExpectedWorkshopDate({
        passWorkshopDateId: "date_a",
        expectedWorkshopDateId: "date_a",
      }),
      { ok: true }
    );
  });

  it("accepts when no expected date is provided", () => {
    assert.deepEqual(
      validateExpectedWorkshopDate({
        passWorkshopDateId: "date_a",
      }),
      { ok: true }
    );
  });

  it("rejects when expected date differs from pass date", () => {
    const result = validateExpectedWorkshopDate({
      passWorkshopDateId: "date_a",
      expectedWorkshopDateId: "date_b",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "WRONG_EVENT");
      assert.match(result.error, /otro evento/i);
    }
  });
});
