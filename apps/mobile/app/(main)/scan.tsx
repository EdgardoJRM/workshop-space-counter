import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { checkinScan } from "@/lib/api";
import { getSelectedEventId } from "./index";
import { useBrand } from "@/lib/theme";

export default function ScanScreen() {
  const { brand } = useBrand();
  const [permission, requestPermission] = useCameraPermissions();
  const [eventId, setEventId] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    void getSelectedEventId().then(setEventId);
  }, []);

  if (!permission) {
    return <View style={styles.centered} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.msg}>Necesitamos acceso a la cámara.</Text>
        <Text style={styles.link} onPress={() => void requestPermission()}>
          Permitir cámara
        </Text>
      </View>
    );
  }

  if (!eventId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.msg}>Selecciona un evento en la pestaña Evento.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {scanning && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={async ({ data }) => {
            if (!scanning) return;
            setScanning(false);
            setResult("Procesando…");
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
                setResult(
                  `${status}: ${res.attendeeName}${res.printJobQueued ? " · Label en cola" : ""}`
                );
              } else {
                setResult(`Error: ${(res as { error?: string }).error}`);
              }
            } catch (e) {
              setResult(e instanceof Error ? e.message : "Error");
            }
            setTimeout(() => {
              setResult(null);
              setScanning(true);
            }, 2500);
          }}
        />
      )}
      <View style={[styles.overlay, { borderColor: brand.accentColor }]}>
        <Text style={styles.hint}>Apunta al QR del pase</Text>
      </View>
      {result && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{result}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  msg: { fontSize: 16, textAlign: "center", color: "#333" },
  link: { fontSize: 16, color: "#0066cc", marginTop: 12 },
  overlay: {
    position: "absolute",
    bottom: 48,
    alignSelf: "center",
    padding: 12,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  hint: { color: "#fff", fontSize: 14 },
  banner: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
  },
  bannerText: { fontSize: 15, fontWeight: "600", textAlign: "center" },
});
