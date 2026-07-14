import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractTokenFromPayload } from "./staff-scan-utils";

describe("extractTokenFromPayload", () => {
  it("extracts token from pass URL", () => {
    assert.equal(
      extractTokenFromPayload("https://pass.example.com/pass/abc123token"),
      "abc123token"
    );
  });

  it("keeps hp: prefixed payload", () => {
    assert.equal(extractTokenFromPayload("hp:abc123"), "hp:abc123");
  });

  it("returns raw token when not a URL", () => {
    assert.equal(extractTokenFromPayload("raw-token-value"), "raw-token-value");
  });

  it("trims surrounding whitespace", () => {
    assert.equal(
      extractTokenFromPayload("  https://pass.example.com/pass/trimmed  "),
      "trimmed"
    );
  });
});
