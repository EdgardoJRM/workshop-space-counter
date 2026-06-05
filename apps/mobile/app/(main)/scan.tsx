import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { checkinScan } from "@/lib/api";
import { getSelectedEventId } from "./index";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

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
        <View style={[styles.card, { width: "100%", maxWidth: 320 }]}>
          <Text style={[styles.title, { fontSize: 18 }]}>Cámara</Text>
          <Text style={[styles.subtitle, { marginTop: 8, marginBottom: 16 }]}>
            Necesitamos acceso a la cámara para escanear códigos QR de check-in.
          </Text>
          <Pressable style={styles.btnPrimary} onPress={() => void requestPermission()}>
            <Text style={styles.btnPrimaryText}>Permitir cámara</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!eventId) {
    return (
      <View style={styles.centered}>
        <View style={styles.cardFlat}>
          <Text style={[styles.subtitle, { textAlign: "center" }]}>
            Selecciona un evento en la pestaña Evento.
          </Text>
        </View>
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
                const status =
                  res.status === "already_checked_in"
                    ? "Ya registrado"
                    : "Check-in OK";
                setResultOk(true);
                setResult(
                  `${status}: ${res.attendeeName}${res.printJobQueued ? " · Label en cola" : ""}`
                );
              } else {
                setResultOk(false);
                setResult(`Error: ${(res as { error?: string }).error}`);
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
      <View style={[scanStyles.frame, { borderColor: colors.accent }]} pointerEvents="none" />

      <View style={scanStyles.bottomHint}>
        <Text style={scanStyles.hintTitle}>Escanear pase</Text>
        <Text style={scanStyles.hintSub}>Apunta al código QR del asistente</Text>
      </View>

      {result ? (
        <View
          style={[
            scanStyles.banner,
            {
              borderLeftColor: resultOk ? colors.success : colors.error,
              backgroundColor: webBrand.white,
            },
          ]}
        >
          <Text
            style={[
              scanStyles.bannerText,
              { color: resultOk ? colors.success : colors.error },
            ]}
          >
            {result}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const scanStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(34, 32, 34, 0.45)",
  },
  frame: {
    position: "absolute",
    top: "28%",
    alignSelf: "center",
    width: 260,
    height: 260,
    borderWidth: 3,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  bottomHint: {
    position: "absolute",
    bottom: 40,
    left: 24,
    right: 24,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "rgba(63, 94, 120, 0.92)",
  },
  hintTitle: {
    color: webBrand.white,
    fontSize: 16,
    fontWeight: "700",
  },
  hintSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginTop: 4,
  },
  banner: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 14,
    borderLeftWidth: 4,
    shadowColor: webBrand.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  bannerText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 22,
  },
});
