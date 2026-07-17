import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildLabelPrintHtml,
  normalizeNameForLabel,
} from "./label-print-html";

describe("normalizeNameForLabel", () => {
  it("splits first and last name", () => {
    const r = normalizeNameForLabel("Ana María López");
    assert.equal(r.firstDisplay, "Ana");
    assert.equal(r.last, "María López");
  });

  it("preserves star on first name", () => {
    const r = normalizeNameForLabel("Juan* Pérez");
    assert.equal(r.firstDisplay, "Juan *");
    assert.equal(r.last, "Pérez");
  });
});

describe("buildLabelPrintHtml", () => {
  it("includes attendee name and page size", () => {
    const html = buildLabelPrintHtml({
      name: "Edgardo Hernandez",
      fontLarge: 160,
      fontSmall: 80,
      mediaSize: "3x2",
      showEmail: false,
      showWorkshop: false,
    });
    assert.match(html, /Edgardo/);
    assert.match(html, /Hernandez/);
    assert.match(html, /size: 3in 2in/);
  });
});
