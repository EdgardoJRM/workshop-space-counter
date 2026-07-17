import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildLabelPrintHtml,
  LABEL_CANVAS_HEIGHT,
  LABEL_CANVAS_WIDTH,
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
  it("wraps a single label image at physical 3x2 inches", () => {
    const html = buildLabelPrintHtml(
      {
        name: "Edgardo Hernandez",
        fontLarge: 160,
        fontSmall: 80,
        mediaSize: "3x2",
        showEmail: false,
        showWorkshop: false,
      },
      "data:image/png;base64,TEST"
    );
    assert.match(html, /size: 3in 2in/);
    assert.match(html, /width: 3in/);
    assert.match(html, /height: 2in/);
    assert.match(html, /data:image\/png;base64,TEST/);
    assert.match(html, /<img /);
  });

  it("supports 2x3 media size", () => {
    const html = buildLabelPrintHtml(
      {
        name: "Test User",
        fontLarge: 120,
        fontSmall: 60,
        mediaSize: "2x3",
        showEmail: false,
        showWorkshop: false,
      },
      "data:image/png;base64,TEST"
    );
    assert.match(html, /size: 2in 3in/);
    assert.match(html, /width: 2in/);
    assert.match(html, /height: 3in/);
  });
});

describe("label canvas dimensions", () => {
  it("matches Impresora Auto 900x600 at 300 DPI", () => {
    assert.equal(LABEL_CANVAS_WIDTH, 900);
    assert.equal(LABEL_CANVAS_HEIGHT, 600);
  });
});
