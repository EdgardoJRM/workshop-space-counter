import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildLabelPrintHtml,
  LABEL_CANVAS_HEIGHT,
  LABEL_CANVAS_WIDTH,
  normalizeNameForLabel,
} from "./label-print-html";
import {
  embedPngDpi,
  pngHasPhysChunk,
  pngPhysPixelsPerMeter,
} from "./png-dpi";

/** Minimal valid 1×1 PNG (IHDR + IDAT + IEND) without pHYs. */
function minimalPngBytes(): Uint8Array {
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

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

describe("embedPngDpi", () => {
  it("inserts pHYs chunk at 300 DPI (11811 px/m)", () => {
    const input = minimalPngBytes();
    assert.equal(pngHasPhysChunk(input), false);

    const output = embedPngDpi(input, 300);
    assert.equal(pngHasPhysChunk(output), true);
    assert.equal(pngPhysPixelsPerMeter(output), 11811);
  });

  it("replaces an existing pHYs chunk", () => {
    const withDpi = embedPngDpi(minimalPngBytes(), 300);
    const again = embedPngDpi(withDpi, 200);
    assert.equal(pngPhysPixelsPerMeter(again), Math.round(200 / 0.0254));
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
    assert.match(html, /object-fit: fill/);
    assert.match(html, /data:image\/png;base64,TEST/);
    assert.equal((html.match(/<img /g) ?? []).length, 1);
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
