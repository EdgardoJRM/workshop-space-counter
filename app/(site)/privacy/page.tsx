export const metadata = {
  title: "Privacy Policy | Hernandez Pass",
  description: "Privacy policy for Hernandez Pass.",
};

const sections = [
  {
    title: "Information We Handle",
    body: "Hernandez Pass processes information needed to manage events, including name, email address, phone number when provided, selected workshop or event, registration status, pass QR code, check-in history, and operational capacity data.",
  },
  {
    title: "How We Use Information",
    body: "We use this information to issue passes, validate attendees, operate event check-in, resend confirmations, print name tags, and help event organizers manage their events.",
  },
  {
    title: "Camera and QR Scanning",
    body: "The app may request camera access to scan QR codes on attendee passes. We do not store photos, videos, or camera images; camera access is used only to read the QR code during check-in.",
  },
  {
    title: "Notifications",
    body: "The app may use notifications to confirm operational actions, such as a completed check-in. Notification permissions can be managed from the device settings.",
  },
  {
    title: "Data Sharing",
    body: "We do not sell personal data. Data is shared only with the event organizer and with technical providers required to operate the service, such as hosting, email, database, and application infrastructure providers.",
  },
  {
    title: "Retention and Security",
    body: "We retain data as needed to operate events, provide support, and meet administrative responsibilities. We use access controls and reasonable safeguards to protect information.",
  },
  {
    title: "Contact",
    body: "To request access, correction, or deletion of information, contact soporte@edgardohernandez.com.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
        Hernandez Pass
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-brand-slate">
        Privacy Policy
      </h1>
      <p className="mt-3 text-sm text-brand-charcoal">
        Last updated: June 8, 2026
      </p>

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold text-brand-slate">{section.title}</h2>
            <p className="mt-2 leading-7 text-brand-charcoal">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
