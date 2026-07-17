import type { PrintJobPayload } from "@/lib/print-jobs";

/** Design canvas matches Impresora Auto: 900×600 px at 300 DPI = 3×2″. */
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

function pxToIn(px: number): string {
  return `${px / LABEL_DPI}in`;
}

function pageSizeCss(mediaSize: string): string {
  const { width, height } = pageDimensions(mediaSize);
  return `${width} ${height}`;
}

function pageDimensions(mediaSize: string): { width: string; height: string } {
  const normalized = mediaSize.trim().toLowerCase().replace(/\s/g, "");
  if (normalized === "2x3" || normalized === "2x3in") {
    return { width: "2in", height: "3in" };
  }
  if (normalized === "4x6" || normalized === "4x6in") {
    return { width: "4in", height: "6in" };
  }
  return { width: "3in", height: "2in" };
}

export function buildLabelPrintHtml(payload: PrintJobPayload): string {
  const { firstDisplay, last } = normalizeNameForLabel(payload.name);
  const extraFontPx = Math.max(40, Math.floor(payload.fontSmall / 2));
  const { width, height } = pageDimensions(payload.mediaSize);
  const pageSize = pageSizeCss(payload.mediaSize);
  const workshop = (payload.workshopLabel || "").trim();
  const email = (payload.email || "").trim();

  const extras: string[] = [];
  if (payload.showWorkshop && workshop) {
    extras.push(
      `<div class="extra" style="font-size:${pxToIn(extraFontPx)}">${escapeHtml(workshop)}</div>`
    );
  }
  if (payload.showEmail && email) {
    extras.push(
      `<div class="extra" style="font-size:${pxToIn(extraFontPx)}">${escapeHtml(email)}</div>`
    );
  }

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
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    color: #000;
    background: #fff;
  }
  .label {
    width: ${width};
    height: ${height};
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: ${pxToIn(160)};
    overflow: hidden;
  }
  .first {
    font-size: ${pxToIn(payload.fontLarge)};
    font-weight: 700;
    line-height: 1;
    text-align: center;
    margin: 0;
  }
  .last {
    font-size: ${pxToIn(payload.fontSmall)};
    font-weight: 600;
    line-height: 1.1;
    text-align: center;
    margin: ${pxToIn(40)} 0 0;
  }
  .extra {
    color: #444;
    text-align: center;
    margin-top: ${pxToIn(30)};
    line-height: 1.2;
  }
  @media print {
    html, body, .label {
      width: ${width};
      height: ${height};
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    .label {
      padding-top: ${pxToIn(160)};
      page-break-after: avoid;
      page-break-inside: avoid;
    }
  }
</style>
</head>
<body>
  <div class="label">
    ${firstDisplay ? `<p class="first">${escapeHtml(firstDisplay)}</p>` : ""}
    ${last ? `<p class="last">${escapeHtml(last)}</p>` : ""}
    ${extras.join("\n")}
  </div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printLabelPayload(payload: PrintJobPayload): Promise<void> {
  return new Promise((resolve, reject) => {
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
    doc.write(buildLabelPrintHtml(payload));
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
    }, 150);
  });
}

export function isChromiumBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isEdge = ua.includes("Edg/");
  const isChrome = ua.includes("Chrome/") && !ua.includes("OPR/");
  return isEdge || isChrome;
}
