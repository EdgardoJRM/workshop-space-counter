import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { EmptyState } from "@/components/EmptyState";
import { IconCircle } from "@/components/IconCircle";
import { checkinScan } from "@/lib/api";
import { getSelectedEventId } from "./index";
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
  const [eventId, setEventId] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultOk, setResultOk] = useState(true);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    void getSelectedEventId().then(setEventId);
  }, []);

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
          <Text style={[styles.rowMeta, { marginTop: 16, textAlign: "center" }]}>
            Tu privacidad es importante. No almacenamos imágenes ni videos.
          </Text>
        </View>
      </View>
    );
  }

  if (!eventId) {
    return (
      <View style={[styles.screenPadded, { flex: 1, justifyContent: "center" }]}>
        <EmptyState
          title="Aún no hay nada aquí"
          message="Selecciona un evento en la pestaña Evento."
          icon="scan-outline"
          hintArrowToEvento
        />
      </View>
    );
  }

  return (
    <View style={scanStyles.container}>
      {scanning && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={async ({ data }) => {
            if (!scanning) return;
            setScanning(false);
            setResult("Procesando…");
            setResultOk(true);
            try {
              let token = data;
              if (token.includes("/pass/")) {
                token = token.split("/pass/").pop() ?? token;
              }
              if (token.startsWith("hp:")) token = token.slice(3);
              const res = await checkinScan(token, eventId);
              if (res.ok) {
                const name = res.attendeeName ?? "Asistente";
                setResultOk(true);
                setResult(
                  res.status === "already_checked_in"
                    ? `${name} — Ya registrado`
                    : `${name} — Check-in registrado`
                );
              } else {
                setResultOk(false);
                setResult((res as { error?: string }).error ?? "Error");
              }
            } catch (e) {
              setResultOk(false);
              setResult(e instanceof Error ? e.message : "Error");
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
        <View
          style={[
            scanStyles.toast,
            {
              backgroundColor: resultOk
                ? "rgba(45, 106, 79, 0.95)"
                : "rgba(196, 71, 43, 0.95)",
            },
          ]}
        >
          {resultOk ? (
            <Ionicons name="checkmark-circle" size={22} color={webBrand.white} />
          ) : (
            <Ionicons name="alert-circle" size={22} color={webBrand.white} />
          )}
          <Text style={scanStyles.toastText}>{result}</Text>
        </View>
      ) : null}
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
