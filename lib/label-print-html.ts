import type { PrintJobPayload } from "@/lib/print-jobs";
import { embedPngDpiFromDataUrl } from "@/lib/png-dpi";

/** Design canvas matches Impresora Auto: 900×600 px at 300 DPI = 3×2″. */
export const LABEL_CANVAS_WIDTH = 900;
export const LABEL_CANVAS_HEIGHT = 600;
const LABEL_DPI = 300;
const VERTICAL_MARGIN_RATIO = 0.09;

export function normalizeNameForLabel(fullName: string) {
  let s = (fullName || "").replace(/\n/g, " ").trim().replace(/\s+/g, " ");
  const hasStar = s.includes("*");
  s = s.replace(/\*/g, "").trim();
  const parts = s.split(" ");
  const firstBase = parts[0] ?? "";
  const last = parts.slice(1).join(" ");
  const firstDisplay = hasStar && firstBase ? `${firstBase} *` : firstBase;
  return { firstDisplay, last, firstBase };
}

function pageDimensions(mediaSize: string): { width: string; height: string; pageSize: string } {
  const normalized = mediaSize.trim().toLowerCase().replace(/\s/g, "");
  if (normalized === "2x3" || normalized === "2x3in") {
    return { width: "2in", height: "3in", pageSize: "2in 3in" };
  }
  if (normalized === "4x6" || normalized === "4x6in") {
    return { width: "4in", height: "6in", pageSize: "4in 6in" };
  }
  return { width: "3in", height: "2in", pageSize: "3in 2in" };
}

type LabelLine = {
  text: string;
  font: string;
  color: string;
  gapAfter: number;
};

function measureTextHeight(ctx: CanvasRenderingContext2D, text: string): number {
  if (!text) return 0;
  const metrics = ctx.measureText(text);
  return (
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || metrics.fontBoundingBoxAscent
  );
}

function buildLabelLines(payload: PrintJobPayload, family: string): LabelLine[] {
  const { firstDisplay, last } = normalizeNameForLabel(payload.name);
  const workshop = (payload.workshopLabel || "").trim();
  const email = (payload.email || "").trim();
  const fontLarge = payload.fontLarge;
  const fontSmall = payload.fontSmall;
  const fontExtra = Math.max(40, Math.floor(fontSmall / 2));

  const lines: LabelLine[] = [];

  if (firstDisplay) {
    lines.push({
      text: firstDisplay,
      font: `bold ${fontLarge}px ${family}`,
      color: "#000000",
      gapAfter: last ? 40 : 30,
    });
  }
  if (last) {
    lines.push({
      text: last,
      font: `600 ${fontSmall}px ${family}`,
      color: "#000000",
      gapAfter: 30,
    });
  }
  if (payload.showWorkshop && workshop) {
    lines.push({
      text: workshop,
      font: `${fontExtra}px ${family}`,
      color: "#444444",
      gapAfter: payload.showEmail && email ? 20 : 0,
    });
  }
  if (payload.showEmail && email) {
    lines.push({
      text: email,
      font: `${fontExtra}px ${family}`,
      color: "#444444",
      gapAfter: 0,
    });
  }

  return lines;
}

/** Renders a centered 900×600 label bitmap with embedded 300 DPI metadata. */
export function renderLabelToDataUrl(payload: PrintJobPayload): string {
  const canvas = document.createElement("canvas");
  canvas.width = LABEL_CANVAS_WIDTH;
  canvas.height = LABEL_CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas no disponible");
  }

  const family = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';
  const lines = buildLabelLines(payload, family);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LABEL_CANVAS_WIDTH, LABEL_CANVAS_HEIGHT);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const blockHeight = lines.reduce((sum, line, index) => {
    ctx.font = line.font;
    const h = measureTextHeight(ctx, line.text);
    const gap = index < lines.length - 1 ? line.gapAfter : 0;
    return sum + h + gap;
  }, 0);

  const marginY = LABEL_CANVAS_HEIGHT * VERTICAL_MARGIN_RATIO;
  let y = Math.max(marginY, (LABEL_CANVAS_HEIGHT - blockHeight) / 2);

  for (const line of lines) {
    ctx.font = line.font;
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, LABEL_CANVAS_WIDTH / 2, y);
    y += measureTextHeight(ctx, line.text) + line.gapAfter;
  }

  const rawDataUrl = canvas.toDataURL("image/png");
  return embedPngDpiFromDataUrl(rawDataUrl, LABEL_DPI);
}

export function buildLabelPrintHtml(payload: PrintJobPayload, imageDataUrl: string): string {
  const { width, height, pageSize } = pageDimensions(payload.mediaSize);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: ${pageSize}; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${width};
    height: ${height};
    max-width: ${width};
    max-height: ${height};
    overflow: hidden;
    background: #fff;
  }
  img {
    display: block;
    width: ${width};
    height: ${height};
    max-width: ${width};
    max-height: ${height};
    object-fit: fill;
    image-rendering: crisp-edges;
    page-break-before: avoid;
    page-break-after: avoid;
    page-break-inside: avoid;
  }
  @media print {
    html, body, img {
      width: ${width};
      height: ${height};
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
  }
</style>
</head>
<body>
  <img src="${imageDataUrl}" alt="" />
</body>
</html>`;
}

export function printLabelPayload(payload: PrintJobPayload): Promise<void> {
  return new Promise((resolve, reject) => {
    let imageDataUrl: string;
    try {
      imageDataUrl = renderLabelToDataUrl(payload);
    } catch (e) {
      reject(e instanceof Error ? e : new Error("No se pudo renderizar el label"));
      return;
    }

    const { width, height } = pageDimensions(payload.mediaSize);

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = [
      "position:fixed",
      "left:-10000px",
      "top:0",
      `width:${width}`,
      `height:${height}`,
      "border:0",
      "opacity:0",
      "pointer-events:none",
    ].join(";");
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      document.body.removeChild(iframe);
      reject(new Error("No se pudo preparar la impresión"));
      return;
    }

    doc.open();
    doc.write(buildLabelPrintHtml(payload, imageDataUrl));
    doc.close();

    let settled = false;
    const cleanup = () => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    win.addEventListener("afterprint", finish, { once: true });

    const img = doc.querySelector("img");
    const startPrint = () => {
      window.setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch {
          fail("window.print falló");
          return;
        }
        window.setTimeout(() => {
          if (!settled) finish();
        }, 30_000);
      }, 100);
    };

    if (img && !img.complete) {
      img.onload = () => startPrint();
      img.onerror = () => fail("No se pudo cargar la imagen del label");
    } else {
      startPrint();
    }
  });
}

export function isChromiumBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isEdge = ua.includes("Edg/");
  const isChrome = ua.includes("Chrome/") && !ua.includes("OPR/");
  return isEdge || isChrome;
}
