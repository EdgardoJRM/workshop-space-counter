import type { PrintJobPayload } from "@/lib/print-jobs";

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

function pageSizeCss(mediaSize: string): string {
  const normalized = mediaSize.trim().toLowerCase().replace(/\s/g, "");
  if (normalized === "3x2" || normalized === "3x2in") return "3in 2in";
  if (normalized === "2x3" || normalized === "2x3in") return "2in 3in";
  if (normalized === "4x6" || normalized === "4x6in") return "4in 6in";
  return "3in 2in";
}

export function buildLabelPrintHtml(payload: PrintJobPayload): string {
  const { firstDisplay, last } = normalizeNameForLabel(payload.name);
  const extraFont = Math.max(40, Math.floor(payload.fontSmall / 2));
  const pageSize = pageSizeCss(payload.mediaSize);
  const workshop = (payload.workshopLabel || "").trim();
  const email = (payload.email || "").trim();

  const extras: string[] = [];
  if (payload.showWorkshop && workshop) {
    extras.push(
      `<div class="extra" style="font-size:${extraFont}px">${escapeHtml(workshop)}</div>`
    );
  }
  if (payload.showEmail && email) {
    extras.push(
      `<div class="extra" style="font-size:${extraFont}px">${escapeHtml(email)}</div>`
    );
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: ${pageSize}; margin: 0; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    color: #000;
    background: #fff;
  }
  .label {
    width: 900px;
    height: 600px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 160px;
    overflow: hidden;
  }
  .first {
    font-size: ${payload.fontLarge}px;
    font-weight: 700;
    line-height: 1;
    text-align: center;
    margin: 0;
  }
  .last {
    font-size: ${payload.fontSmall}px;
    font-weight: 600;
    line-height: 1.1;
    text-align: center;
    margin: 40px 0 0;
  }
  .extra {
    color: #444;
    text-align: center;
    margin-top: 30px;
    line-height: 1.2;
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
