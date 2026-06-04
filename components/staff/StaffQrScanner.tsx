"use client";

import { useEffect, useRef } from "react";
import { extractTokenFromPayload } from "@/lib/staff-scan-utils";

const READER_ID = "staff-qr-reader";
const SCAN_COOLDOWN_MS = 2500;

type StaffQrScannerProps = {
  active: boolean;
  disabled: boolean;
  onScan: (token: string) => void | Promise<void>;
  onError: (message: string) => void;
};

export function StaffQrScanner({
  active,
  disabled,
  onScan,
  onError,
}: StaffQrScannerProps) {
  const lastScanRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        scanner = new Html5Qrcode(READER_ID);
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 12,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.75;
              return { width: size, height: size };
            },
            aspectRatio: 1,
          },
          (decoded) => {
            if (disabled || cancelled) return;
            const now = Date.now();
            if (now - lastScanRef.current < SCAN_COOLDOWN_MS) return;
            lastScanRef.current = now;
            const token = extractTokenFromPayload(decoded);
            if (token) void onScanRef.current(token);
          },
          () => {
            /* frame sin QR */
          }
        );
      } catch (e) {
        if (!cancelled) {
          onError(
            e instanceof Error
              ? e.message
              : "No se pudo usar la cámara. Revisa permisos en Safari/Chrome."
          );
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (scanner) {
        const s = scanner;
        void s.stop().finally(() => {
          try {
            s.clear();
          } catch {
            /* ignore */
          }
        });
      }
    };
  }, [active, disabled, onError]);

  if (!active) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-brand-grey/25 bg-brand-off/50 text-sm text-brand-grey">
        Pulsa «Escanear QR» para activar la cámara
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-brand-grey/25 bg-black">
      <div id={READER_ID} className="w-full [&_video]:!object-cover" />
    </div>
  );
}
