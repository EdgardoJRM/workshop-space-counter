import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

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
  return new SESClient({ region });
}

function getFromAddress(): string | null {
  return (
    process.env.EMAIL_FROM?.trim() ?? process.env.SES_FROM_EMAIL?.trim() ?? null
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendMagicLinkEmail(params: {
  to: string;
  magicLink: string;
  intentLabel: string;
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const ses = getSesClient();
  const from = getFromAddress();
  if (!ses) {
    return { ok: false, error: "AWS_REGION is not configured" };
  }
  if (!from) {
    return { ok: false, error: "EMAIL_FROM is not configured" };
  }

  const link = params.magicLink;
  const subject = `Tu enlace de acceso — Hernandez Pass`;

  try {
    const result = await ses.send(
      new SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [params.to] },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Html: {
              Data: `
<!DOCTYPE html>
<html lang="es">
<body style="font-family:system-ui,sans-serif;background:#f2f2f2;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;">
    <p style="color:#3f5e78;font-size:12px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Hernandez Pass</p>
    <h1 style="color:#222022;font-size:20px;">Acceso ${escapeHtml(params.intentLabel)}</h1>
    <p style="color:#4c5c68;line-height:1.6;">Haz clic para entrar. El enlace caduca en 15 minutos.</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${escapeHtml(link)}" style="display:inline-block;background:#ffc907;color:#222022;font-weight:600;padding:14px 28px;border-radius:8px;text-decoration:none;">Entrar</a>
    </p>
    <p style="color:#a5a5a5;font-size:11px;word-break:break-all;">${escapeHtml(link)}</p>
  </div>
</body>
</html>`,
              Charset: "UTF-8",
            },
            Text: {
              Data: `Acceso Hernandez Pass (${params.intentLabel}):\n${link}\n\nCaduca en 15 minutos.`,
              Charset: "UTF-8",
            },
          },
        },
      })
    );
    return { ok: true, id: result.MessageId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to send magic link",
    };
  }
}
