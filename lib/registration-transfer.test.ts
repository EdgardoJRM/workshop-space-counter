import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { guestExternalOrderId } from "./clickfunnels";

describe("guestExternalOrderId", () => {
  it("builds guest order ids from base order", () => {
    assert.equal(guestExternalOrderId("cf:123", 1), "cf:123:guest:1");
    assert.equal(guestExternalOrderId("cf:123", 2), "cf:123:guest:2");
  });
});
