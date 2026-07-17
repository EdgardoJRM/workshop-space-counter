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
  it("uses physical 3x2 inch canvas and typography at 300 DPI", () => {
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
    assert.match(html, /\.label \{\s*width: 3in;/);
    assert.match(html, /height: 2in;/);
    assert.match(html, /font-size: 0\.5333333333333333in/); // 160/300
    assert.match(html, /padding-top: 0\.5333333333333333in/); // 160/300
  });

  it("supports 2x3 media size", () => {
    const html = buildLabelPrintHtml({
      name: "Test User",
      fontLarge: 120,
      fontSmall: 60,
      mediaSize: "2x3",
      showEmail: false,
      showWorkshop: false,
    });
    assert.match(html, /size: 2in 3in/);
    assert.match(html, /width: 2in;/);
    assert.match(html, /height: 3in;/);
  });
});
