import { SESClient, SendEmailCommand, SendRawEmailCommand } from "@aws-sdk/client-ses";
import QRCode from "qrcode";

const PASS_QR_CID = "pass-qr@hernandezpass";
const PASS_MAP_CID = "pass-map@hernandezpass";

export type PassEmailParams = {
  to: string;
  attendeeName: string;
  workshopLabel: string;
  eventDate: string;
  venue: string | null;
  mapsUrl: string | null;
  passUrl: string;
  checkinToken: string;
};

export function resolveMapsLink(venue: string | null, mapsUrl: string | null): string | null {
  const custom = mapsUrl?.trim();
  if (custom && /^https?:\/\//i.test(custom)) return custom;
  const place = venue?.trim();
  if (!place) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

async function fetchMapPreviewPng(
  venue: string | null,
  mapsUrl: string | null
): Promise<Buffer | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) return null;

  const marker = venue?.trim() || mapsUrl?.trim();
  if (!marker) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("size", "520x200");
  url.searchParams.set("scale", "2");
  url.searchParams.set("maptype", "roadmap");
  url.searchParams.set("markers", `color:0x3f5e78|${marker}`);
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 100 ? buf : null;
  } catch {
    return null;
  }
}

function getSesClient(): SESClient | null {
  const region = process.env.AWS_REGION?.trim();
  if (!region) return null;

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

  if (accessKeyId && secretAccessKey) {
    return new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        sessionToken: process.env.AWS_SESSION_TOKEN?.trim(),
      },
    });
  }

  // En AWS (Lambda/ECS) o con credenciales por defecto en el entorno
  return new SESClient({ region });
}

function getFromAddress(): string | null {
  const from = process.env.EMAIL_FROM?.trim() ?? process.env.SES_FROM_EMAIL?.trim();
  return from || null;
}

function buildLocationHtml(venue: string | null, mapsLink: string | null, hasMapImage: boolean): string {
  if (!venue && !mapsLink) return "";

  const venueHtml = venue
    ? `<p style="color:#4c5c68;line-height:1.6;margin:0 0 12px;"><strong>Ubicación:</strong><br/>${escapeHtml(venue)}</p>`
    : "";

  const mapImg = hasMapImage
    ? `<div style="text-align:center;margin:0 0 12px;">
      <img src="cid:${PASS_MAP_CID}" alt="Mapa de ubicación" width="520" height="200" style="max-width:100%;height:auto;border-radius:8px;border:1px solid #e0e0e0;"/>
    </div>`
    : "";

  const mapsBtn = mapsLink
    ? `<p style="text-align:center;margin:0;">
      <a href="${escapeHtml(mapsLink)}" style="display:inline-block;background:#3f5e78;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">Cómo llegar (Google Maps)</a>
    </p>`
    : "";

  return `<div style="margin:20px 0;padding:16px;background:#f8f9fa;border-radius:8px;border:1px solid #e8e8e8;">
    ${venueHtml}
    ${mapImg}
    ${mapsBtn}
  </div>`;
}

function buildPassHtml(
  params: PassEmailParams,
  name: string,
  mapsLink: string | null,
  hasMapImage: boolean
): string {
  const passUrl = escapeHtml(params.passUrl);
  const locationBlock = buildLocationHtml(params.venue, mapsLink, hasMapImage);
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/></head>
<body style="font-family: system-ui, sans-serif; background:#f2f2f2; padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e0e0e0;">
    <p style="color:#3f5e78;font-size:12px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 8px;">Hernandez Pass</p>
    <h1 style="color:#222022;font-size:22px;margin:0 0 16px;">Hola, ${escapeHtml(name)}</h1>
    <p style="color:#4c5c68;line-height:1.6;">Tu registro está confirmado para <strong>${escapeHtml(params.workshopLabel)}</strong>.</p>
    <p style="color:#4c5c68;line-height:1.6;"><strong>Fecha:</strong> ${escapeHtml(params.eventDate)}</p>
    ${locationBlock}
    <div style="text-align:center;margin:28px 0;">
      <img src="cid:${PASS_QR_CID}" alt="Código QR de tu pase" width="280" height="280" style="border-radius:8px;display:block;margin:0 auto;"/>
    </div>
    <p style="text-align:center;">
      <a href="${passUrl}" style="display:inline-block;background:#ffc907;color:#222022;font-weight:600;padding:14px 28px;border-radius:8px;text-decoration:none;">Ver mi pase</a>
    </p>
    <p style="color:#a5a5a5;font-size:12px;margin-top:24px;text-align:center;">Si no ves el QR arriba, abre &quot;Ver mi pase&quot;. Preséntalo el día del evento para tu check-in.</p>
  </div>
</body>
</html>`;
}

function wrapBase64Lines(b64: string, lineLength = 76): string {
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += lineLength) {
    lines.push(b64.slice(i, i + lineLength));
  }
  return lines.join("\r\n");
}

function encodeMimeSubject(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

/** MIME multipart/related: HTML + PNG inline (cid). Compatible con Gmail/Outlook. */
function buildPassMimeRaw(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  qrPng: Buffer;
  mapPng?: Buffer | null;
}): string {
  const boundary = `hp_${Date.now().toString(36)}`;
  const htmlB64 = wrapBase64Lines(Buffer.from(params.html, "utf8").toString("base64"));
  const parts: string[] = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${encodeMimeSubject(params.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/related; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    htmlB64,
    "",
    `--${boundary}`,
    "Content-Type: image/png; name=\"pass-qr.png\"",
    "Content-Transfer-Encoding: base64",
    `Content-ID: <${PASS_QR_CID}>`,
    "Content-Disposition: inline; filename=\"pass-qr.png\"",
    "",
    wrapBase64Lines(params.qrPng.toString("base64")),
    "",
  ];

  if (params.mapPng) {
    parts.push(
      `--${boundary}`,
      "Content-Type: image/png; name=\"pass-map.png\"",
      "Content-Transfer-Encoding: base64",
      `Content-ID: <${PASS_MAP_CID}>`,
      "Content-Disposition: inline; filename=\"pass-map.png\"",
      "",
      wrapBase64Lines(params.mapPng.toString("base64")),
      ""
    );
  }

  parts.push(`--${boundary}--`, "");
  return parts.join("\r\n");
}

export async function sendPassEmail(
  params: PassEmailParams
): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const ses = getSesClient();
  const from = getFromAddress();

  if (!ses) {
    return {
      ok: false,
      error: "AWS_REGION is not configured (and credentials missing)",
    };
  }

  if (!from) {
    return {
      ok: false,
      error: "EMAIL_FROM or SES_FROM_EMAIL is not configured",
    };
  }

  if (!params.passUrl.startsWith("http")) {
    return {
      ok: false,
      error:
        "APP_BASE_URL no está configurado: el enlace del pase debe ser URL absoluta para el QR",
    };
  }

  let qrPng: Buffer;
  try {
    qrPng = await QRCode.toBuffer(params.passUrl, {
      type: "png",
      width: 280,
      margin: 2,
      color: { dark: "#222022", light: "#ffffff" },
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to generate QR",
    };
  }

  const name = params.attendeeName || "Participante";
  const mapsLink = resolveMapsLink(params.venue, params.mapsUrl);
  const mapPng = await fetchMapPreviewPng(params.venue, params.mapsUrl);
  const html = buildPassHtml(params, name, mapsLink, Boolean(mapPng));
  const subject = `Tu pase — ${params.workshopLabel}`;
  const raw = buildPassMimeRaw({
    from,
    to: params.to,
    subject,
    html,
    qrPng,
    mapPng,
  });

  const configurationSet = process.env.SES_CONFIGURATION_SET?.trim();

  try {
    const result = await ses.send(
      new SendRawEmailCommand({
        Source: from,
        Destinations: [params.to],
        RawMessage: {
          Data: new Uint8Array(Buffer.from(raw)),
        },
        ...(configurationSet
          ? { ConfigurationSetName: configurationSet }
          : {}),
      })
    );

    return { ok: true, id: result.MessageId };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to send email via SES";
    return { ok: false, error: message };
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type HtmlEmailParams = {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
};

export async function sendHtmlEmail(
  params: HtmlEmailParams
): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const ses = getSesClient();
  const from = getFromAddress();

  if (!ses) {
    return { ok: false, error: "AWS_REGION is not configured" };
  }
  if (!from) {
    return { ok: false, error: "EMAIL_FROM is not configured" };
  }

  const configurationSet = process.env.SES_CONFIGURATION_SET?.trim();

  try {
    const result = await ses.send(
      new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [params.to] },
        Message: {
          Subject: { Data: params.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: params.htmlBody, Charset: "UTF-8" },
            Text: {
              Data: params.textBody ?? params.subject,
              Charset: "UTF-8",
            },
          },
        },
        ...(configurationSet
          ? { ConfigurationSetName: configurationSet }
          : {}),
      })
    );
    return { ok: true, id: result.MessageId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to send email",
    };
  }
}

/** Reemplaza {{name}}, {{email}}, {{workshop}}, {{eventDate}}, {{venue}} */
export function renderEmailTemplate(
  html: string,
  vars: Record<string, string>
): string {
  let out = html;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}
