import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pickRegistrationToKeep,
  type DuplicateRegistrationCandidate,
} from "./registration-dedup";

function row(
  partial: Partial<DuplicateRegistrationCandidate> & Pick<DuplicateRegistrationCandidate, "id">
): DuplicateRegistrationCandidate {
  return {
    workshopDateId: "wd-1",
    email: "buyer@example.com",
    attendeeName: "Buyer",
    registeredAt: new Date("2026-06-01T10:00:00Z"),
    source: "clickfunnels",
    externalOrderId: partial.id,
    checkinCount: 0,
    hasGuestInfoRequest: false,
    ...partial,
  };
}

describe("pickRegistrationToKeep", () => {
  it("prefers a checked-in registration", () => {
    const keep = pickRegistrationToKeep([
      row({ id: "newer", registeredAt: new Date("2026-06-02T10:00:00Z") }),
      row({
        id: "checked-in",
        registeredAt: new Date("2026-06-01T10:00:00Z"),
        checkinCount: 1,
      }),
    ]);

    assert.equal(keep.id, "checked-in");
  });

  it("keeps the oldest when none are checked in", () => {
    const keep = pickRegistrationToKeep([
      row({ id: "second", registeredAt: new Date("2026-06-02T10:00:00Z") }),
      row({ id: "first", registeredAt: new Date("2026-06-01T10:00:00Z") }),
    ]);

    assert.equal(keep.id, "first");
  });
});
