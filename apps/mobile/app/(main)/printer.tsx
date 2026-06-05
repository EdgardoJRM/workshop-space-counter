import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { printerStatus } from "@/lib/api";
import { useBrand } from "@/lib/theme";

export default function PrinterScreen() {
  const { brand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{
    connected: boolean;
    pending: number;
    processing: number;
    printedLast24h: number;
    lastPollAt: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await printerStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 10000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Impresora Mac</Text>
      <Text style={styles.sub}>
        Empareja la Mac del evento desde el admin web → Impresora.
      </Text>

      {loading ? (
        <ActivityIndicator color={brand.accentColor} style={{ marginTop: 24 }} />
      ) : status ? (
        <View style={styles.card}>
          <Text style={styles.status}>
            {status.connected ? "● Conectada" : "○ Sin conexión reciente"}
          </Text>
          <Text style={styles.line}>Pendientes: {status.pending}</Text>
          <Text style={styles.line}>Procesando: {status.processing}</Text>
          <Text style={styles.line}>Impresos (24h): {status.printedLast24h}</Text>
          {status.lastPollAt && (
            <Text style={styles.muted}>
              Último poll: {new Date(status.lastPollAt).toLocaleString("es-PR")}
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.muted}>No se pudo cargar el estado.</Text>
      )}

      <Pressable
        style={[styles.button, { backgroundColor: brand.accentColor }]}
        onPress={() => void load()}
      >
        <Text style={styles.buttonText}>Actualizar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f5f5f2" },
  title: { fontSize: 20, fontWeight: "700" },
  sub: { fontSize: 13, color: "#666", marginTop: 4, marginBottom: 16 },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  status: { fontSize: 18, fontWeight: "700" },
  line: { fontSize: 15 },
  muted: { fontSize: 12, color: "#888", marginTop: 8 },
  button: {
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { fontWeight: "700", color: "#111" },
});
