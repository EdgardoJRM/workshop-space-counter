import type { PrintJobPayload } from "@/lib/print-jobs";

/** Design canvas matches Impresora Auto: 900×600 px at 300 DPI = 3×2″. */
export const LABEL_CANVAS_WIDTH = 900;
export const LABEL_CANVAS_HEIGHT = 600;
const LABEL_DPI = 300;

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

function measureTextHeight(ctx: CanvasRenderingContext2D, text: string): number {
  if (!text) return 0;
  const metrics = ctx.measureText(text);
  return (
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || metrics.fontBoundingBoxAscent
  );
}

/** Renders the label bitmap exactly like impresora-auto/print_core.py (900×600 @ 300 DPI). */
export function renderLabelToDataUrl(payload: PrintJobPayload): string {
  const canvas = document.createElement("canvas");
  canvas.width = LABEL_CANVAS_WIDTH;
  canvas.height = LABEL_CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas no disponible");
  }

  const { firstDisplay, last, firstBase } = normalizeNameForLabel(payload.name);
  const workshop = (payload.workshopLabel || "").trim();
  const email = (payload.email || "").trim();
  const fontLarge = payload.fontLarge;
  const fontSmall = payload.fontSmall;
  const fontExtra = Math.max(40, Math.floor(fontSmall / 2));
  const family = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LABEL_CANVAS_WIDTH, LABEL_CANVAS_HEIGHT);
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  let y1 = 160;
  let y2 = y1;

  if (firstDisplay) {
    ctx.font = `bold ${fontLarge}px ${family}`;
    const w1Base = ctx.measureText(firstBase || firstDisplay).width;
    const x1 = (LABEL_CANVAS_WIDTH - w1Base) / 2;
    ctx.fillText(firstDisplay, x1 + w1Base / 2, y1);
    const h1 = measureTextHeight(ctx, firstDisplay);
    y2 = y1 + h1 + 40;
  }

  if (last) {
    ctx.font = `600 ${fontSmall}px ${family}`;
    ctx.fillText(last, LABEL_CANVAS_WIDTH / 2, y2);
    const h2 = measureTextHeight(ctx, last);
    let extraY = y2 + h2 + 30;

    if (payload.showWorkshop && workshop) {
      ctx.font = `${fontExtra}px ${family}`;
      ctx.fillStyle = "#444444";
      ctx.fillText(workshop, LABEL_CANVAS_WIDTH / 2, extraY);
      extraY += 50;
    }
    if (payload.showEmail && email) {
      ctx.font = `${fontExtra}px ${family}`;
      ctx.fillStyle = "#444444";
      ctx.fillText(email, LABEL_CANVAS_WIDTH / 2, extraY);
    }
  } else {
    let extraY = y1 + measureTextHeight(ctx, firstDisplay) + 30;
    if (payload.showWorkshop && workshop) {
      ctx.font = `${fontExtra}px ${family}`;
      ctx.fillStyle = "#444444";
      ctx.fillText(workshop, LABEL_CANVAS_WIDTH / 2, extraY);
      extraY += 50;
    }
    if (payload.showEmail && email) {
      ctx.font = `${fontExtra}px ${family}`;
      ctx.fillStyle = "#444444";
      ctx.fillText(email, LABEL_CANVAS_WIDTH / 2, extraY);
    }
  }

  return canvas.toDataURL("image/png");
}

export function buildLabelPrintHtml(payload: PrintJobPayload, imageDataUrl: string): string {
  const { width, height, pageSize } = pageDimensions(payload.mediaSize);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: ${pageSize}; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
    width: ${width};
    height: ${height};
    max-width: ${width};
    max-height: ${height};
    overflow: hidden;
  }
  img {
    display: block;
    width: ${width};
    height: ${height};
    max-width: ${width};
    max-height: ${height};
    margin: 0;
    padding: 0;
    page-break-after: avoid;
    page-break-inside: avoid;
  }
  @media print {
    html, body {
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

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
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
