import { sendDuplicaVentasCheckinResourcesEmail } from "../lib/duplica-ventas-checkin-email.ts";

const to = process.argv[2]?.trim() || "edgardoehernandezjr@gmail.com";
const name = process.argv[3]?.trim() || "Edgardo";

const result = await sendDuplicaVentasCheckinResourcesEmail({
  to,
  attendeeName: name,
});

if (!result.ok) {
  console.error("Failed:", result.error);
  process.exit(1);
}

console.log("Sent preview to", to);
