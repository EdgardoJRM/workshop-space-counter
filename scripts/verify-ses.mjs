/**
 * Verifica Amazon SES (misma región/credenciales que lib/email.ts).
 *
 *   node scripts/verify-ses.mjs
 *   node scripts/verify-ses.mjs --send-test
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  SESClient,
  GetSendQuotaCommand,
  ListIdentitiesCommand,
  GetIdentityVerificationAttributesCommand,
  SendEmailCommand,
} from "@aws-sdk/client-ses";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const region = process.env.AWS_REGION?.trim() || "us-east-1";
const from =
  process.env.EMAIL_FROM?.trim() || process.env.SES_FROM_EMAIL?.trim();
const sendTest = process.argv.includes("--send-test");

console.log("=== Hernandez Pass — verificación SES ===\n");
console.log("Región:", region);
console.log(
  "EMAIL_FROM:",
  from ? from.replace(/<[^>]+>/, "<…>") : "(no definido en .env.local)"
);
console.log(
  "Credenciales:",
  process.env.AWS_ACCESS_KEY_ID
    ? "variables AWS_* en .env.local"
    : "perfil AWS CLI por defecto (~/.aws/credentials)"
);
console.log("");

const client = new SESClient({
  region,
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          sessionToken: process.env.AWS_SESSION_TOKEN,
        },
      }
    : {}),
});

try {
  const quota = await client.send(new GetSendQuotaCommand({}));
  console.log("Cuota SES:");
  console.log("  Max24HourSend:", quota.Max24HourSend);
  console.log("  MaxSendRate:", quota.MaxSendRate);
  console.log("  SentLast24Hours:", quota.SentLast24Hours);
  console.log("");

  const { Identities = [] } = await client.send(
    new ListIdentitiesCommand({ MaxItems: 50 })
  );
  const attrs = await client.send(
    new GetIdentityVerificationAttributesCommand({ Identities })
  );
  const verified = Identities.filter(
    (id) => attrs.VerificationAttributes?.[id]?.VerificationStatus === "Success"
  );
  console.log(`Identidades verificadas (${verified.length}):`);
  for (const id of verified.slice(0, 12)) {
    console.log("  -", id);
  }
  if (verified.length > 12) {
    console.log(`  ... y ${verified.length - 12} más`);
  }
  console.log("");

  if (!from) {
    console.log("⚠ Falta EMAIL_FROM en .env.local. Sugerencia verificada:");
    const suggested = verified.find((e) => e.includes("@edgardohernandez.com"));
    if (suggested) {
      console.log(`  EMAIL_FROM="Hernandez Pass <${suggested}>"`);
    }
    process.exit(1);
  }

  const fromEmail = from.match(/<([^>]+)>/)?.[1] ?? from;
  const fromOk = verified.some(
    (id) =>
      id === fromEmail ||
      (id.startsWith(".") === false &&
        fromEmail.endsWith(id.replace(/^\./, "")))
  );
  if (!fromOk) {
    console.log(
      "⚠ EMAIL_FROM puede no estar verificado en SES:",
      fromEmail
    );
  } else {
    console.log("✓ Remitente coincide con identidad verificada.");
  }

  if (!sendTest) {
    console.log("\nOK: SDK SES accesible.");
    console.log("Prueba de envío: node scripts/verify-ses.mjs --send-test");
    process.exit(0);
  }

  const to =
    process.env.SES_TEST_TO?.trim() || "edgardoehernandezjr@gmail.com";
  const result = await client.send(
    new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: {
          Data: "Hernandez Pass — prueba CLI",
          Charset: "UTF-8",
        },
        Body: {
          Text: {
            Data: "Si recibes esto, SES está listo para Hernandez Pass.",
            Charset: "UTF-8",
          },
        },
      },
    })
  );
  console.log("\n✓ Email de prueba enviado.");
  console.log("  MessageId:", result.MessageId);
  console.log("  To:", to);
} catch (e) {
  console.error("\n✗ Error:", e.name || "Error", e.message || e);
  process.exit(1);
}
