"use client";

import { useEffect } from "react";

/**
 * Mantiene la pantalla encendida y fondo blanco puro para escanear el QR.
 * Los navegadores no permiten subir el brillo del sistema (p. ej. iOS Safari).
 */
export function PassScreenEnhancer() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    const prevColorScheme = html.style.colorScheme;

    html.style.backgroundColor = "#ffffff";
    body.style.backgroundColor = "#ffffff";
    html.style.colorScheme = "light only";

    let wakeLock: WakeLockSentinel | null = null;

    async function acquireWakeLock() {
      if (!("wakeLock" in navigator)) return;
      try {
        if (wakeLock && !wakeLock.released) return;
        wakeLock = await navigator.wakeLock.request("screen");
      } catch {
        /* permiso denegado o API no disponible */
      }
    }

    void acquireWakeLock();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void acquireWakeLock();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void wakeLock?.release();
      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
      html.style.colorScheme = prevColorScheme;
    };
  }, []);

  return null;
}
