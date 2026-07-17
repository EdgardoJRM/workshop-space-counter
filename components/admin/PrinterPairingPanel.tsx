"use client";

import { useCallback, useEffect, useState } from "react";
import { PrintStationLinkBlock } from "@/components/admin/PrintStationLinkBlock";

type Agent = {
  id: string;
  name: string | null;
  lastSeenAt: string | null;
  createdAt: string;
};

export function PrinterPairingPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/printer-pairing");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setAgents(data.agents ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCode() {
    setError(null);
    const res = await fetch("/api/admin/printer-pairing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear código");
      return;
    }
    setCode(data.code);
    setExpiresAt(data.expiresAt);
  }

  async function revoke(agentId: string) {
    await fetch("/api/admin/printer-pairing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke", agentId }),
    });
    void load();
  }

  return (
    <div className="space-y-6 rounded-2xl border border-brand-grey/20 bg-white p-6">
      <div className="rounded-xl border border-brand-slate/20 bg-brand-off/50 p-4">
        <h2 className="text-lg font-semibold">Estación web (recomendado)</h2>
        <p className="mt-1 text-sm text-brand-grey">
          En la Mac del evento abre Chrome con la estación de impresión. No requiere
          Instalar Impresora Auto.
        </p>
        <PrintStationLinkBlock className="mt-3" />
        <p className="mt-3 text-xs text-brand-grey">
          Chrome con{" "}
          <code className="text-[11px]">--kiosk-printing</code> para imprimir sin diálogo.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Impresora Mac (agente legacy)</h2>
        <p className="mt-1 text-sm text-brand-grey">
          Solo si la estación web falla. Genera un código de 8 caracteres. En la Mac corre{" "}
          <code className="text-xs">zsh emparejar.sh</code> y pégalo.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void createCode()}
        className="rounded-lg bg-brand-slate px-4 py-2 text-sm font-medium text-white"
      >
        Generar código nuevo
      </button>

      {code && (
        <div className="rounded-xl bg-brand-off/60 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-brand-grey">Código</p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-[0.3em]">{code}</p>
          {expiresAt && (
            <p className="mt-2 text-xs text-brand-grey">
              Expira: {new Date(expiresAt).toLocaleString("es-PR")}
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <h3 className="text-sm font-semibold">Impresoras conectadas</h3>
        {loading ? (
          <p className="mt-2 text-sm text-brand-grey">Cargando…</p>
        ) : agents.length === 0 ? (
          <p className="mt-2 text-sm text-brand-grey">Ninguna aún.</p>
        ) : (
          <ul className="mt-2 divide-y rounded-lg border">
            {agents.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{a.name ?? "Mac"}</p>
                  <p className="text-xs text-brand-grey">
                    Última vez:{" "}
                    {a.lastSeenAt
                      ? new Date(a.lastSeenAt).toLocaleString("es-PR")
                      : "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void revoke(a.id)}
                  className="text-xs text-red-600 underline"
                >
                  Revocar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
