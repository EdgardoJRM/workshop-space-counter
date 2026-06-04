"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StaffQrScanner } from "@/components/staff/StaffQrScanner";
import { formatWorkshopDateTime } from "@/lib/workshop-datetime";
import { postCheckin, type ScanResult } from "@/lib/staff-scan-utils";

type ScanSession = {
  workshopDateId: string;
  workshopSlug: string;
  workshopLabel: string;
  label: string;
  startsAt: string;
  isToday: boolean;
  isActive: boolean;
  registrationCount: number;
  checkedInCount: number;
};

type AttendeeRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  checkedIn: boolean;
  checkedInAt: string | null;
};

type Tab = "scan" | "search";

export function StaffScanner() {
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [todayKey, setTodayKey] = useState("");
  const [usingToday, setUsingToday] = useState(true);
  const [sessionId, setSessionId] = useState("");
  const [contextError, setContextError] = useState<string | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);

  const [tab, setTab] = useState<Tab>("scan");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.workshopDateId === sessionId) ?? null,
    [sessions, sessionId]
  );

  useEffect(() => {
    void (async () => {
      setLoadingContext(true);
      setContextError(null);
      try {
        const res = await fetch("/api/checkins/context");
        const data = (await res.json()) as {
          error?: string;
          sessions?: ScanSession[];
          todayKey?: string;
          usingToday?: boolean;
        };
        if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
        const list = data.sessions ?? [];
        setSessions(list);
        setTodayKey(data.todayKey ?? "");
        setUsingToday(data.usingToday ?? true);
        if (list.length === 1) {
          setSessionId(list[0].workshopDateId);
        } else if (list.length > 1) {
          const todayOne = list.find((s) => s.isToday);
          setSessionId(todayOne?.workshopDateId ?? list[0].workshopDateId);
        }
      } catch (e) {
        setContextError(e instanceof Error ? e.message : "Error al cargar fechas");
      } finally {
        setLoadingContext(false);
      }
    })();
  }, []);

  const runCheckin = useCallback(
    async (body: {
      token?: string;
      registrationId?: string;
      workshopDateId?: string;
    }) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      const response = await postCheckin(body);
      if (!response.ok) {
        setError(response.error);
        setBusy(false);
        return;
      }
      setLastResult(response.result);
      setBusy(false);
      if (body.registrationId && sessionId) {
        setAttendees((prev) =>
          prev.map((a) =>
            a.id === body.registrationId
              ? {
                  ...a,
                  checkedIn: true,
                  checkedInAt: response.result.checkedInAt,
                }
              : a
          )
        );
      }
    },
    [busy, sessionId]
  );

  const handleQrScan = useCallback(
    (token: string) => {
      void runCheckin({ token, workshopDateId: sessionId });
    },
    [runCheckin, sessionId]
  );

  useEffect(() => {
    if (tab !== "search" || !sessionId) return;

    const timer = setTimeout(() => {
      void (async () => {
        setLoadingAttendees(true);
        try {
          const params = new URLSearchParams({
            workshopDateId: sessionId,
            q: searchQuery.trim(),
          });
          const res = await fetch(`/api/checkins/attendees?${params}`);
          const data = (await res.json()) as {
            error?: string;
            attendees?: AttendeeRow[];
          };
          if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
          setAttendees(data.attendees ?? []);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Error al buscar");
        } finally {
          setLoadingAttendees(false);
        }
      })();
    }, 250);

    return () => clearTimeout(timer);
  }, [tab, sessionId, searchQuery]);

  useEffect(() => {
    if (tab === "scan" && sessionId && !cameraOn) {
      setCameraOn(true);
    }
  }, [tab, sessionId, cameraOn]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login?intent=staff";
  }

  function sessionSummary() {
    if (!selectedSession) return null;
    const when = formatWorkshopDateTime(new Date(selectedSession.startsAt));
    return (
      <p className="mt-1 text-xs text-brand-charcoal">
        {selectedSession.workshopLabel}
        {selectedSession.isToday ? (
          <span className="ml-1 rounded bg-brand-blue/15 px-1.5 py-0.5 font-semibold text-brand-blue">
            Hoy
          </span>
        ) : (
          <span className="ml-1 text-amber-700">(fecha activa)</span>
        )}
        <span className="block text-brand-grey">{when}</span>
        <span className="text-brand-grey">
          {selectedSession.checkedInCount} / {selectedSession.registrationCount}{" "}
          check-in
        </span>
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
            Staff Scanner
          </p>
          <h1 className="text-xl font-semibold text-brand-slate">Check-in</h1>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="shrink-0 text-sm text-brand-charcoal underline"
        >
          Salir
        </button>
      </div>

      <section className="mt-4 rounded-xl border border-brand-grey/20 bg-white p-4">
        <label className="block text-xs font-semibold uppercase tracking-wide text-brand-blue">
          Evento de hoy
        </label>
        {loadingContext && (
          <p className="mt-2 text-sm text-brand-grey">Cargando fechas…</p>
        )}
        {contextError && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {contextError}
          </p>
        )}
        {!loadingContext && !sessions.length && (
          <p className="mt-2 text-sm text-amber-700">
            No hay evento para hoy ({todayKey}) ni fecha activa. Configura una
            fecha en Admin → Fechas.
          </p>
        )}
        {!loadingContext && sessions.length > 0 && (
          <>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-brand-grey/30 bg-white px-3 py-2.5 text-sm"
            >
              {sessions.map((s) => (
                <option key={s.workshopDateId} value={s.workshopDateId}>
                  {s.label}
                </option>
              ))}
            </select>
            {!usingToday && (
              <p className="mt-1 text-xs text-amber-700">
                No hay taller hoy; mostrando fechas activas del sistema.
              </p>
            )}
            {sessionSummary()}
          </>
        )}
      </section>

      {sessions.length > 0 && sessionId && (
        <>
          <div
            className="mt-4 flex rounded-xl border border-brand-grey/20 bg-white p-1"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "scan"}
              onClick={() => setTab("scan")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
                tab === "scan"
                  ? "bg-brand-slate text-white"
                  : "text-brand-charcoal"
              }`}
            >
              Escanear QR
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "search"}
              onClick={() => {
                setTab("search");
                setCameraOn(false);
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
                tab === "search"
                  ? "bg-brand-slate text-white"
                  : "text-brand-charcoal"
              }`}
            >
              Buscar persona
            </button>
          </div>

          {tab === "scan" && (
            <div className="mt-4">
              <StaffQrScanner
                active={cameraOn}
                disabled={busy}
                onScan={handleQrScan}
                onError={setCameraError}
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCameraError(null);
                    setCameraOn((v) => !v);
                  }}
                  className="flex-1 rounded-lg border border-brand-grey/30 py-2.5 text-sm font-semibold text-brand-charcoal"
                >
                  {cameraOn ? "Pausar cámara" : "Activar cámara"}
                </button>
              </div>
              {cameraError && (
                <p className="mt-2 text-sm text-amber-700" role="status">
                  {cameraError}
                </p>
              )}
              <p className="mt-2 text-center text-xs text-brand-grey">
                Apunta al QR del pase. Funciona en Safari y Chrome (móvil).
              </p>
            </div>
          )}

          {tab === "search" && (
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-brand-charcoal">
                Buscar por nombre, email o teléfono
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Escribe para filtrar…"
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-brand-grey/30 px-3 py-2.5 text-sm"
                />
              </label>

              {loadingAttendees && (
                <p className="text-sm text-brand-grey">Buscando…</p>
              )}

              <ul className="max-h-[min(50vh,360px)] space-y-2 overflow-y-auto">
                {!loadingAttendees && !attendees.length && (
                  <li className="rounded-lg bg-brand-off/50 px-3 py-4 text-center text-sm text-brand-grey">
                    {searchQuery.trim()
                      ? "Sin resultados"
                      : "Sin registros en esta fecha"}
                  </li>
                )}
                {attendees.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runCheckin({
                          registrationId: a.id,
                          workshopDateId: sessionId,
                        })
                      }
                      className="flex w-full items-start justify-between gap-2 rounded-lg border border-brand-grey/20 bg-white px-3 py-3 text-left transition hover:border-brand-blue/40 hover:bg-brand-blue/5 disabled:opacity-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-brand-ink">
                          {a.name}
                        </p>
                        <p className="truncate text-xs text-brand-grey">
                          {a.email}
                        </p>
                        {a.phone && (
                          <p className="text-xs text-brand-grey">{a.phone}</p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          a.checkedIn
                            ? "bg-brand-gold/20 text-brand-charcoal"
                            : "bg-brand-blue/15 text-brand-blue"
                        }`}
                      >
                        {a.checkedIn ? "Listo" : "Check-in"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {busy && (
        <p className="mt-4 text-center text-sm text-brand-grey">Validando…</p>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {lastResult && (
        <div
          className={`mt-4 rounded-xl border p-4 ${
            lastResult.status === "checked_in"
              ? "border-brand-blue/30 bg-brand-blue/5"
              : "border-brand-gold/40 bg-brand-gold/10"
          }`}
        >
          <p className="font-semibold text-brand-ink">
            {lastResult.status === "checked_in"
              ? "Check-in exitoso"
              : "Ya registrado"}
          </p>
          <p className="mt-1 text-sm text-brand-charcoal">
            {lastResult.attendeeName} — {lastResult.workshopLabel}
          </p>
          <p className="mt-1 text-xs text-brand-grey">
            {new Date(lastResult.checkedInAt).toLocaleString("es-PR")}
          </p>
          {lastResult.status === "checked_in" && lastResult.printJobQueued && (
            <p className="mt-2 text-xs font-medium text-brand-blue">
              Label en cola — la impresora lo tomará en segundos.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
