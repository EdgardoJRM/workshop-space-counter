import { escapeHtml, sendHtmlEmail } from "@/lib/email";
import { emailHtmlToPlainText } from "@/lib/email-template-text";

const COMANDO_URL = "https://www.edgardohernandez.net/comando-estrategico";
const CALCULADORA_URL = "https://www.edgardohernandez.net/calculadora";
const BOVEDA_URL = "https://boveda.edgardohernandez.com";

export type DuplicaVentasCheckinEmailParams = {
  to: string;
  attendeeName: string;
};

function buildHtml(name: string): string {
  const safeName = escapeHtml(name);
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/></head>
<body style="font-family: system-ui, sans-serif; background:#f2f2f2; padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e0e0e0;">
    <p style="color:#3f5e78;font-size:12px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 8px;">Duplica Tus Ventas</p>
    <h1 style="color:#222022;font-size:22px;margin:0 0 16px;">Hola, ${safeName}</h1>
    <p style="color:#4c5c68;line-height:1.7;margin:0 0 20px;">¡Bienvenido/a al taller! Sigue estos pasos para conectarte al WiFi del evento y acceder rápidamente a tus herramientas.</p>

    <div style="margin:0 0 20px;padding:18px;background:#f8f9fa;border-radius:12px;border:1px solid #e1e5e8;">
      <p style="color:#3f5e78;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 10px;">Cómo conectarte al WiFi</p>
      <ol style="color:#4c5c68;line-height:1.8;margin:0;padding-left:20px;">
        <li>Busca la red: <strong>PRSTRT-PUBLIC</strong></li>
        <li>Inicia sesión con tu email</li>
        <li>Introduce el código que recibirás en tu correo</li>
      </ol>
    </div>

    <div style="margin:0 0 20px;padding:18px;background:#f8f9fa;border-radius:12px;border:1px solid #e1e5e8;">
      <p style="color:#3f5e78;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 10px;">Herramientas del taller</p>
      <ul style="color:#4c5c68;line-height:1.8;margin:0 0 14px;padding-left:20px;">
        <li>ChatGPT</li>
        <li>Ads Manager</li>
        <li>Facebook Business</li>
      </ul>
      <p style="margin:0 0 10px;">
        <a href="${COMANDO_URL}" style="color:#3f5e78;font-weight:700;">Asistente de comandos estratégicos</a>
        <span style="color:#888;font-size:13px;"> — crea anuncios persuasivos con IA</span>
      </p>
      <p style="margin:0 0 10px;">
        <a href="${CALCULADORA_URL}" style="color:#3f5e78;font-weight:700;">Calculadora de inversión en Ads</a>
        <span style="color:#888;font-size:13px;"> — proyecta costos y resultados</span>
      </p>
      <p style="margin:0;">
        <a href="${BOVEDA_URL}" style="color:#3f5e78;font-weight:700;">La Bóveda</a>
        <span style="color:#888;font-size:13px;"> — materiales exclusivos del taller (revisa tu correo de acceso)</span>
      </p>
    </div>

    <p style="color:#4c5c68;line-height:1.7;margin:0;">¡Con esto tendrás todo listo para aprovechar al máximo la experiencia!</p>
    <p style="color:#888;font-size:13px;line-height:1.6;margin:24px 0 0;">Éxitosamente,<br/><strong>Edgardo Hernández</strong><br/>Acelerando tu Negocio</p>
  </div>
</body>
</html>`;
}

function buildText(name: string): string {
  return [
    `Hola, ${name}`,
    "",
    "¡Bienvenido/a al taller Duplica Tus Ventas!",
    "",
    "Cómo conectarte al WiFi:",
    "1. Busca la red: PRSTRT-PUBLIC",
    "2. Inicia sesión con tu email",
    "3. Introduce el código que recibirás en tu correo",
    "",
    "Herramientas del taller:",
    "- ChatGPT",
    "- Ads Manager",
    "- Facebook Business",
    "",
    `Asistente de comandos estratégicos: ${COMANDO_URL}`,
    `Calculadora de inversión en Ads: ${CALCULADORA_URL}`,
    `La Bóveda (materiales exclusivos): ${BOVEDA_URL}`,
    "",
    "¡Con esto tendrás todo listo para aprovechar al máximo la experiencia!",
    "",
    "Éxitosamente,",
    "Edgardo Hernández",
    "Acelerando tu Negocio",
  ].join("\n");
}

export async function sendDuplicaVentasCheckinResourcesEmail(
  params: DuplicaVentasCheckinEmailParams
): Promise<{ ok: boolean; error?: string }> {
  const htmlBody = buildHtml(params.attendeeName);
  return sendHtmlEmail({
    to: params.to,
    subject: "Tu acceso al evento: WiFi + Recursos Exclusivos",
    htmlBody,
    textBody: buildText(params.attendeeName),
  });
}
