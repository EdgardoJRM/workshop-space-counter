import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { EmptyState } from "@/components/EmptyState";
import { SelectedEventBanner } from "@/components/SelectedEventBanner";
import { IconCircle } from "@/components/IconCircle";
import { checkinScan } from "@/lib/api";
import { useSelectedEvent } from "@/lib/event-context";
import { showLocalNotification } from "@/lib/push-notifications";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

function ScanCorners({ color }: { color: string }) {
  const len = 28;
  const thick = 4;
  const corner = (pos: object) => ({
    position: "absolute" as const,
    width: len,
    height: len,
    borderColor: color,
    ...pos,
  });

  return (
    <>
      <View style={[corner({ top: 0, left: 0 }), { borderTopWidth: thick, borderLeftWidth: thick }]} />
      <View style={[corner({ top: 0, right: 0 }), { borderTopWidth: thick, borderRightWidth: thick }]} />
      <View style={[corner({ bottom: 0, left: 0 }), { borderBottomWidth: thick, borderLeftWidth: thick }]} />
      <View style={[corner({ bottom: 0, right: 0 }), { borderBottomWidth: thick, borderRightWidth: thick }]} />
    </>
  );
}

export default function ScanScreen() {
  const { colors, styles } = useAppTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const { selectedEventId: eventId } = useSelectedEvent();
  const [result, setResult] = useState<string | null>(null);
  const [resultOk, setResultOk] = useState(true);
  const [scanning, setScanning] = useState(true);
  const handlingRef = useRef(false);
  const lastTokenRef = useRef<{ token: string; at: number } | null>(null);

  if (!permission) {
    return <View style={[styles.centered, { backgroundColor: "#000" }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <View style={[styles.card, { width: "100%", maxWidth: 320, alignItems: "center" }]}>
          <IconCircle name="camera-outline" size={72} variant="gold" />
          <Text style={[styles.title, { fontSize: 20, marginTop: 16 }]}>Cámara</Text>
          <Text style={[styles.subtitle, { marginTop: 8, marginBottom: 20, textAlign: "center" }]}>
            Necesitamos acceso para escanear QR
          </Text>
          <Pressable
            style={[styles.btnPrimary, { width: "100%", flexDirection: "row", gap: 8 }]}
            onPress={() => void requestPermission()}
          >
            <Ionicons name="camera-outline" size={20} color={colors.onAccent} />
            <Text style={styles.btnPrimaryText}>Permitir cámara</Text>
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 16 }}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.textSubtle} />
            <Text style={[styles.rowMeta, { flex: 1, textAlign: "center", lineHeight: 18 }]}>
              Tu privacidad es importante. No almacenamos imágenes ni vídeos.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!eventId) {
    return (
      <View style={{ flex: 1 }}>
        <SelectedEventBanner />
        <View style={[styles.screenPadded, { flex: 1, justifyContent: "center" }]}>
        <EmptyState
          title="Aún no hay nada aquí"
          message="Selecciona un evento en la pestaña Evento."
          hintArrowToEvento
        />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SelectedEventBanner />
    <View style={[scanStyles.container, { flex: 1 }]}>
      {scanning && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={async ({ data }) => {
            if (!scanning || handlingRef.current) return;

            let token = data;
            if (token.includes("/pass/")) {
              token = token.split("/pass/").pop() ?? token;
            }
            if (token.startsWith("hp:")) token = token.slice(3);

            const now = Date.now();
            const last = lastTokenRef.current;
            if (last && last.token === token && now - last.at < 3000) return;

            handlingRef.current = true;
            lastTokenRef.current = { token, at: now };
            setScanning(false);
            setResult("Procesando…");
            setResultOk(true);
            try {
              const res = await checkinScan(token, eventId);
              if (res.ok) {
                const name = res.attendeeName ?? "Asistente";
                setResultOk(true);
                const printNote =
                  res.printError
                    ? ` — Falló: ${res.printError}`
                    : res.printJobQueued === false
                      ? res.status === "already_checked_in"
                        ? ""
                        : " — Impreso"
                      : res.status !== "already_checked_in"
                        ? " — Imprimiendo…"
                        : "";
                const msg =
                  res.status === "already_checked_in"
                    ? `${name} — Ya registrado${printNote}`
                    : `${name} — Check-in registrado${printNote}`;
                setResult(msg);
                if (res.status !== "already_checked_in") {
                  void showLocalNotification("Check-in registrado", name);
                }
              } else {
                setResultOk(false);
                setResult((res as { error?: string }).error ?? "Error");
              }
            } catch (e) {
              setResultOk(false);
              setResult(e instanceof Error ? e.message : "Error");
            } finally {
              handlingRef.current = false;
            }
            setTimeout(() => {
              setResult(null);
              setScanning(true);
            }, 2800);
          }}
        />
      )}

      <View style={scanStyles.dim} pointerEvents="none" />

      <View style={scanStyles.topHint} pointerEvents="none">
        <Text style={scanStyles.topHintText}>Apunta al código QR del pase</Text>
      </View>

      <View style={[scanStyles.frameWrap, { borderColor: colors.accent }]} pointerEvents="none">
        <ScanCorners color={colors.accent} />
        <View style={[scanStyles.scanLine, { backgroundColor: colors.accent }]} />
      </View>

      {result ? (
        <View style={[scanStyles.toast, { backgroundColor: "rgba(34, 32, 34, 0.88)" }]}>
          {resultOk ? (
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.success,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="checkmark" size={18} color={webBrand.white} />
            </View>
          ) : (
            <Ionicons name="alert-circle" size={22} color="#f87171" />
          )}
          <Text
            style={[
              scanStyles.toastText,
              { color: resultOk ? "#4ade80" : "#fca5a5" },
            ]}
          >
            {result}
          </Text>
        </View>
      ) : null}
    </View>
    </View>
  );
}

const scanStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(34, 32, 34, 0.5)",
  },
  topHint: {
    position: "absolute",
    top: 72,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  topHintText: {
    color: webBrand.white,
    fontSize: 14,
    fontWeight: "600",
  },
  frameWrap: {
    position: "absolute",
    top: "26%",
    alignSelf: "center",
    width: 260,
    height: 260,
  },
  scanLine: {
    position: "absolute",
    top: "50%",
    left: 8,
    right: 8,
    height: 2,
    opacity: 0.9,
  },
  toast: {
    position: "absolute",
    bottom: 110,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  toastText: {
    flex: 1,
    color: webBrand.white,
    fontSize: 15,
    fontWeight: "600",
  },
});
