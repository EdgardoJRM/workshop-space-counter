import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import { printerStatus } from "@/lib/api";
import { useAppTheme } from "@/lib/useAppTheme";

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  const { styles } = useAppTheme();
  return (
    <View style={{ flex: 1, minWidth: "45%" }}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function PrinterScreen() {
  const { colors, styles } = useAppTheme();
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
    <View style={styles.screenPadded}>
      <Text style={styles.sectionLabel}>Mac del evento</Text>
      <Text style={styles.title}>Impresora</Text>
      <Text style={[styles.subtitle, { marginBottom: 20 }]}>
        Empareja la Mac del evento desde el admin web → Impresora.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
      ) : status ? (
        <View style={styles.card}>
          <View
            style={[
              styles.badge,
              status.connected ? styles.badgeSuccess : undefined,
              { marginBottom: 16 },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                status.connected ? styles.badgeSuccessText : undefined,
              ]}
            >
              {status.connected ? "● Conectada" : "○ Sin conexión reciente"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            <Metric label="Pendientes" value={status.pending} />
            <Metric label="Procesando" value={status.processing} />
            <Metric label="Impresos (24h)" value={status.printedLast24h} />
          </View>

          {status.lastPollAt ? (
            <Text style={[styles.metricLabel, { marginTop: 16 }]}>
              Último poll:{" "}
              {new Date(status.lastPollAt).toLocaleString("es-PR")}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.cardFlat}>
          <Text style={styles.subtitle}>No se pudo cargar el estado.</Text>
        </View>
      )}

      <Pressable
        style={[styles.btnPrimary, { marginTop: 24 }]}
        onPress={() => void load()}
      >
        <Text style={styles.btnPrimaryText}>Actualizar</Text>
      </Pressable>
    </View>
  );
}
