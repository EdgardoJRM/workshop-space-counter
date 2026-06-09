"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_EMAIL_BODY_PLAIN,
  emailHtmlToPlainText,
  plainTextToEmailHtml,
} from "@/lib/email-template-text";

type EmailAnchor = "event_start" | "checkin";

type TemplateRow = {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  delayHours: number;
  anchor: EmailAnchor;
  active: boolean;
};

type LogRow = {
  id: string;
  templateName: string;
  attendeeEmail: string;
  attendeeName: string | null;
  workshopLabel: string;
  sentAt: string;
  status: string;
  error: string | null;
};

const EMPTY_FORM = {
  name: "",
  subject: "",
  body: DEFAULT_EMAIL_BODY_PLAIN,
  delayHours: "0",
  anchor: "checkin" as EmailAnchor,
  active: true,
};

function formatDelay(hours: number, anchor: EmailAnchor): string {
  const reference = anchor === "checkin" ? "del check-in" : "del evento";
  if (hours === 0) {
    return anchor === "checkin" ? "Al momento del check-in" : "Al momento del evento";
  }
  if (hours < 24) return `${hours}h después ${reference}`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  if (rem === 0) return `${days} día${days > 1 ? "s" : ""} después ${reference}`;
  return `${days}d ${rem}h después ${reference}`;
}

function formatSentAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function EmailSequencePanel() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/email-templates");
      const data = (await res.json()) as {
        error?: string;
        templates?: TemplateRow[];
        logs?: LogRow[];
      };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setTemplates(data.templates ?? []);
      setLogs(data.logs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(row: TemplateRow) {
    setEditingId(row.id);
    setShowForm(true);
    setForm({
      name: row.name,
      subject: row.subject,
      body: emailHtmlToPlainText(row.htmlBody),
      delayHours: String(row.delayHours),
      anchor: row.anchor ?? "event_start",
      active: row.active,
    });
  }

  function startCreate() {
    setEditingId(null);
    setShowForm(true);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const delayHours = Number.parseInt(form.delayHours, 10);
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? undefined,
          name: form.name.trim(),
          subject: form.subject.trim(),
          htmlBody: plainTextToEmailHtml(form.body),
          delayHours: Number.isInteger(delayHours) ? delayHours : 0,
          anchor: form.anchor,
          active: form.active,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string) {
    setError(null);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "toggle" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cambiar estado");
    }
  }

  const sentCount = logs.filter((l) => l.status === "sent").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;

  return (
    <div className="pb-4">
      <div className="rounded-2xl border border-brand-grey/30 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => (showForm ? setShowForm(false) : startCreate())}
            className="rounded-lg bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-brand-charcoal"
          >
            {showForm ? "Cancelar" : "Nueva plantilla"}
          </button>
        </div>

        <p className="mt-2 text-xs text-brand-grey">
          Variables: {"{{name}}"}, {"{{email}}"}, {"{{workshop}}"}, {"{{eventDate}}"}, {"{{venue}}"}.
          Elige si el delay es desde el inicio del evento o desde el check-in (escaneo QR).
          Con check-in y 0h, el email sale al escanear; con más horas, el cron diario lo envía después.
        </p>

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {showForm && (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3 border-t border-brand-grey/20 pt-4">
            <label className="block text-xs font-medium">
              Nombre interno
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium">
              Asunto
              <input
                required
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium">
              Referencia del tiempo
              <select
                value={form.anchor}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    anchor: e.target.value as EmailAnchor,
                  }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="checkin">Check-in (escaneo QR)</option>
                <option value="event_start">Inicio del evento</option>
              </select>
            </label>
            <label className="block text-xs font-medium">
              Delay (horas después de la referencia)
              <input
                type="number"
                min={0}
                required
                value={form.delayHours}
                onChange={(e) => setForm((f) => ({ ...f, delayHours: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
              <span className="mt-1 block text-[11px] text-brand-grey">
                {formatDelay(Number.parseInt(form.delayHours, 10) || 0, form.anchor)}
              </span>
            </label>
            <label className="block text-xs font-medium">
              Mensaje del correo
              <textarea
                required
                rows={8}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder={"Hola {{name}},\n\nGracias por asistir a {{workshop}}..."}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm leading-relaxed"
              />
              <span className="mt-1 block text-[11px] text-brand-grey">
                Texto normal — sin HTML. Párrafos con línea en blanco. Variables:{" "}
                {"{{name}}"}, {"{{workshop}}"}, etc.
              </span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Activa
            </label>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-brand-slate py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Guardando…" : editingId ? "Actualizar" : "Crear plantilla"}
            </button>
          </form>
        )}

        {loading ? (
          <p className="mt-4 text-sm text-brand-grey">Cargando…</p>
        ) : (
          <>
            <ul className="mt-4 space-y-2">
              {templates.length === 0 ? (
                <li className="text-sm text-brand-grey">Sin plantillas aún.</li>
              ) : (
                templates.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-xl border border-brand-grey/25 p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-brand-charcoal">{t.name}</p>
                        <p className="text-xs text-brand-grey">{t.subject}</p>
                        <p className="mt-1 text-xs text-brand-blue">
                          {formatDelay(t.delayHours, t.anchor ?? "event_start")}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          t.active
                            ? "bg-green-100 text-green-800"
                            : "bg-brand-grey/20 text-brand-grey"
                        }`}
                      >
                        {t.active ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(t)}
                        className="text-xs text-brand-blue underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggle(t.id)}
                        className="text-xs text-brand-charcoal underline"
                      >
                        {t.active ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>

            <div className="mt-6 border-t border-brand-grey/20 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                Últimos envíos
              </h3>
              <p className="mt-1 text-xs text-brand-grey">
                {sentCount} enviados · {failedCount} fallidos (últimos 50)
              </p>
              {logs.length === 0 ? (
                <p className="mt-2 text-sm text-brand-grey">Aún no hay envíos.</p>
              ) : (
                <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                  {logs.map((l) => (
                    <li key={l.id} className="rounded-lg bg-brand-off/50 p-2 text-xs">
                      <span className="font-medium">{l.templateName}</span>
                      {" · "}
                      {l.attendeeEmail}
                      {" · "}
                      {l.workshopLabel}
                      <br />
                      <span className="text-brand-grey">{formatSentAt(l.sentAt)}</span>
                      {" · "}
                      <span
                        className={
                          l.status === "sent" ? "text-green-700" : "text-red-600"
                        }
                      >
                        {l.status}
                      </span>
                      {l.error && (
                        <span className="block text-red-600">{l.error}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
