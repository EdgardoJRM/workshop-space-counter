import { buildEmailUrl, buildWhatsAppUrl } from "@/lib/leads";

type LeadActionsProps = {
  name: string | null;
  email: string | null;
  phone: string | null;
  compact?: boolean;
};

export function LeadActions({ name, email, phone, compact = false }: LeadActionsProps) {
  const whatsappUrl = buildWhatsAppUrl(phone, name);
  const emailUrl = buildEmailUrl(email, name);
  const className = compact
    ? "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
    : "inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700";

  return (
    <div className="flex flex-wrap gap-2">
      {whatsappUrl ? (
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className={className}>
          WhatsApp
        </a>
      ) : (
        <span className={`${className} cursor-not-allowed opacity-40`}>WhatsApp</span>
      )}
      {emailUrl ? (
        <a href={emailUrl} className={className}>
          Email
        </a>
      ) : (
        <span className={`${className} cursor-not-allowed opacity-40`}>Email</span>
      )}
    </div>
  );
}
