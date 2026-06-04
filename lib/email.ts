import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import QRCode from "qrcode";

export type PassEmailParams = {
  to: string;
  attendeeName: string;
  workshopLabel: string;
  eventDate: string;
  venue: string | null;
  passUrl: string;
  checkinToken: string;
};

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

function buildPassHtml(params: PassEmailParams, qrDataUrl: string, name: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/></head>
<body style="font-family: system-ui, sans-serif; background:#f2f2f2; padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e0e0e0;">
    <p style="color:#3f5e78;font-size:12px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 8px;">Hernandez Pass</p>
    <h1 style="color:#222022;font-size:22px;margin:0 0 16px;">Hola, ${escapeHtml(name)}</h1>
    <p style="color:#4c5c68;line-height:1.6;">Tu registro está confirmado para <strong>${escapeHtml(params.workshopLabel)}</strong>.</p>
    <p style="color:#4c5c68;line-height:1.6;"><strong>Fecha:</strong> ${escapeHtml(params.eventDate)}</p>
    ${params.venue ? `<p style="color:#4c5c68;line-height:1.6;"><strong>Lugar:</strong> ${escapeHtml(params.venue)}</p>` : ""}
    <div style="text-align:center;margin:28px 0;">
      <img src="${qrDataUrl}" alt="Código QR de tu pase" width="280" height="280" style="border-radius:8px;"/>
    </div>
    <p style="text-align:center;">
      <a href="${escapeHtml(params.passUrl)}" style="display:inline-block;background:#ffc907;color:#222022;font-weight:600;padding:14px 28px;border-radius:8px;text-decoration:none;">Ver mi pase</a>
    </p>
    <p style="color:#a5a5a5;font-size:12px;margin-top:24px;text-align:center;">Presenta este QR el día del evento para tu check-in.</p>
  </div>
</body>
</html>`;
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

  let qrDataUrl: string;
  try {
    qrDataUrl = await QRCode.toDataURL(params.passUrl, {
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
  const html = buildPassHtml(params, qrDataUrl, name);
  const subject = `Tu pase — ${params.workshopLabel}`;

  const configurationSet = process.env.SES_CONFIGURATION_SET?.trim();

  try {
    const result = await ses.send(
      new SendEmailCommand({
        Source: from,
        Destination: {
          ToAddresses: [params.to],
        },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: html, Charset: "UTF-8" },
            Text: {
              Data: `Hola ${name},\n\nTu pase para ${params.workshopLabel} (${params.eventDate}):\n${params.passUrl}\n\nPresenta el QR el día del evento.`,
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
