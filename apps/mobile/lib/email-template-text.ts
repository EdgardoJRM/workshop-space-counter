/** Misma lógica que lib/email-template-text.ts (raíz del repo). */

const HAS_HTML_TAG = /<[a-z][\s\S]*>/i;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function plainTextToEmailHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";
  if (HAS_HTML_TAG.test(normalized)) return normalized;

  return normalized
    .split(/\n\n+/)
    .map((paragraph) => {
      const inner = paragraph
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br/>");
      return `<p>${inner}</p>`;
    })
    .join("\n");
}

export function emailHtmlToPlainText(html: string): string {
  if (!html.trim()) return "";
  if (!HAS_HTML_TAG.test(html)) return html.replace(/\r\n/g, "\n").trim();

  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/?p[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export const DEFAULT_EMAIL_BODY_PLAIN = `Hola {{name}},

Gracias por asistir a {{workshop}} el {{eventDate}}.

¡Nos vemos pronto!`;
