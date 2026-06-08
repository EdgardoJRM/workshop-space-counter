import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeAvailable, pickWorkshopDateId } from "./capacity";

describe("computeAvailable", () => {
  it("returns remaining seats", () => {
    assert.equal(computeAvailable(25, 10), 15);
  });

  it("never returns negative availability", () => {
    assert.equal(computeAvailable(25, 30), 0);
  });
});

describe("pickWorkshopDateId", () => {
  it("prefers explicit workshopDateId", () => {
    assert.equal(
      pickWorkshopDateId("explicit-id", "selling-id"),
      "explicit-id"
    );
  });

  it("uses selling date when explicit id is missing", () => {
    assert.equal(pickWorkshopDateId(null, "selling-id"), "selling-id");
    assert.equal(pickWorkshopDateId(undefined, "selling-id"), "selling-id");
  });

  it("returns null when neither id is available", () => {
    assert.equal(pickWorkshopDateId(null, null), null);
    assert.equal(pickWorkshopDateId(undefined, undefined), null);
  });
});
