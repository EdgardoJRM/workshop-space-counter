"use client";

import { forwardRef } from "react";
import { formatWorkshopDateTime } from "@/lib/workshop-datetime";
import {
  registrationInitials,
  registrationStatusLabel,
} from "@/components/admin/registration-ui";

export type RegistrationListCardRow = {
  id: string;
  attendeeName: string | null;
  attendeeEmail: string;
  attendeePhone: string | null;
  source: string | null;
  eventDate: string;
  status: string;
  registeredAt: string;
  emailedAt: string | null;
  emailError: string | null;
  checkedIn: boolean;
  certificateEmailedAt: string | null;
  certificateError: string | null;
  printStatus: string | null;
  printError: string | null;
};

function printStatusLabel(status: string | null): string {
  switch (status) {
    case "PENDING":
      return "Label pendiente";
    case "PROCESSING":
      return "Imprimiendo…";
    case "PRINTED":
      return "Label impreso";
    case "FAILED":
      return "Error de impresión";
    default:
      return "Sin label";
  }
}

function statusBadgeClass(status: string, checkedIn: boolean): string {
  if (status === "CANCELLED") {
    return "bg-brand-grey/15 text-brand-grey";
  }
  if (checkedIn) {
    return "bg-emerald-100 text-emerald-800";
  }
  return "bg-amber-100 text-amber-900";
}

function avatarClass(status: string, checkedIn: boolean): string {
  if (status === "CANCELLED") {
    return "bg-brand-grey/20 text-brand-grey";
  }
  if (checkedIn) {
    return "bg-emerald-100 text-emerald-700";
  }
  return "bg-amber-100 text-amber-800";
}

type Props = {
  row: RegistrationListCardRow;
  highlighted?: boolean;
  certificatesEnabled?: boolean;
  resending?: boolean;
  resendingCertificate?: boolean;
  reprinting?: boolean;
  cancelling?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onResend: () => void;
  onResendCertificate: () => void;
  onReprint: () => void;
};

export const RegistrationListCard = forwardRef<HTMLLIElement, Props>(function RegistrationListCard(
  {
  row,
  highlighted,
  certificatesEnabled,
  resending,
  resendingCertificate,
  reprinting,
  cancelling,
  onEdit,
  onCancel,
  onResend,
  onResendCertificate,
  onReprint,
  },
  ref
) {
  const displayName = row.attendeeName ?? row.attendeeEmail;
  const statusLabel = registrationStatusLabel(row);
  const cancelled = row.status === "CANCELLED";

  return (
    <li
      ref={ref}
      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
        highlighted
          ? "border-brand-gold ring-2 ring-brand-gold/40"
          : "border-brand-grey/20"
      } ${cancelled ? "opacity-70" : ""}`}
    >
      <div className="flex gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarClass(
            row.status,
            row.checkedIn
          )}`}
        >
          {registrationInitials(row.attendeeName, row.attendeeEmail)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-brand-ink">{displayName}</p>
              <p className="truncate text-sm text-brand-grey">{row.attendeeEmail}</p>
              {row.attendeePhone ? (
                <p className="text-xs text-brand-grey">{row.attendeePhone}</p>
              ) : null}
            </div>
            {row.source ? (
              <span className="shrink-0 rounded-full bg-brand-off px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-grey">
                {row.source}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-xs text-brand-charcoal">
            Evento: {formatWorkshopDateTime(new Date(row.eventDate))}
          </p>
          <p className="text-xs text-brand-grey">
            Registrado: {formatWorkshopDateTime(new Date(row.registeredAt))}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(
                row.status,
                row.checkedIn
              )}`}
            >
              {statusLabel}
            </span>
            {row.emailedAt ? (
              <span className="text-xs text-brand-grey">Email enviado</span>
            ) : (
              <span className="text-xs text-amber-700">
                {row.emailError ?? "Email pendiente"}
              </span>
            )}
            <span
              className={`text-xs ${
                row.printStatus === "FAILED"
                  ? "text-red-600"
                  : row.printStatus === "PRINTED"
                    ? "text-brand-grey"
                    : "text-brand-charcoal"
              }`}
              title={row.printError ?? undefined}
            >
              {printStatusLabel(row.printStatus)}
            </span>
            {certificatesEnabled && row.checkedIn ? (
              <span
                className={`text-xs ${
                  row.certificateEmailedAt ? "text-brand-grey" : "text-amber-700"
                }`}
                title={row.certificateError ?? undefined}
              >
                {row.certificateEmailedAt
                  ? "Certificado enviado"
                  : row.certificateError ?? "Certificado pendiente"}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {!cancelled ? (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-brand-grey/30 px-3 py-1.5 text-xs font-semibold text-brand-charcoal"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
          >
            {cancelling ? "Cancelando…" : "Cancelar"}
          </button>
          <button
            type="button"
            onClick={onReprint}
            disabled={reprinting}
            className="rounded-lg border border-brand-blue px-3 py-1.5 text-xs font-semibold text-brand-blue disabled:opacity-50"
          >
            {reprinting ? "Encolando…" : "Reimprimir label"}
          </button>
          <button
            type="button"
            onClick={onResend}
            disabled={resending}
            className="rounded-lg border border-brand-blue px-3 py-1.5 text-xs font-semibold text-brand-blue disabled:opacity-50"
          >
            {resending ? "Enviando…" : "Reenviar pase"}
          </button>
          {certificatesEnabled && row.checkedIn ? (
            <button
              type="button"
              onClick={onResendCertificate}
              disabled={resendingCertificate}
              className="rounded-lg border border-brand-gold px-3 py-1.5 text-xs font-semibold text-brand-charcoal disabled:opacity-50"
            >
              {resendingCertificate ? "Enviando…" : "Reenviar certificado"}
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
});
