import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { InfoBanner } from "@/components/InfoBanner";
import { StatusBadge } from "@/components/StatusBadge";
import { printerStatus } from "@/lib/api";
import { useAppTheme } from "@/lib/useAppTheme";

function MetricCell({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  valueColor?: string;
}) {
  const { colors, styles } = useAppTheme();

  return (
    <View
      style={{
        width: "50%",
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
      }}
    >
      <Ionicons name={icon} size={22} color={colors.accent} style={{ marginBottom: 8 }} />
      <Text style={[styles.metricValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
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

  function lastSeenLabel(): string {
    if (!status?.lastPollAt) return "sin datos";
    const sec = Math.round((Date.now() - new Date(status.lastPollAt).getTime()) / 1000);
    if (sec < 60) return `hace ${sec} s`;
    return new Date(status.lastPollAt).toLocaleString("es-PR");
  }

  return (
    <View style={styles.screenPadded}>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
      ) : status ? (
        <View style={styles.card}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  backgroundColor: "rgba(63, 94, 120, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="print" size={28} color={colors.primary} />
              </View>
              <View>
                <StatusBadge
                  label={status.connected ? "Conectada" : "Desconectada"}
                  variant={status.connected ? "success" : "muted"}
                />
                <Text style={[styles.rowMeta, { marginTop: 6 }]}>
                  Agente Mac · última vez {lastSeenLabel()}
                </Text>
              </View>
            </View>
            {status.connected ? (
              <Ionicons name="wifi" size={22} color={colors.success} />
            ) : null}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -1 }}>
            <MetricCell icon="document-text-outline" label="Pendientes" value={status.pending} />
            <MetricCell icon="sync-outline" label="En proceso" value={status.processing} />
            <MetricCell icon="print-outline" label="Impresas 24h" value={status.printedLast24h} />
            <MetricCell
              icon="checkmark-circle-outline"
              label="Cola"
              value="OK"
              valueColor={colors.success}
            />
          </View>
        </View>
      ) : (
        <View style={styles.cardFlat}>
          <Text style={styles.subtitle}>No se pudo cargar el estado.</Text>
        </View>
      )}

      <Pressable
        style={[
          styles.btnPrimary,
          { marginTop: 24, flexDirection: "row", gap: 8, justifyContent: "center" },
        ]}
        onPress={() => void load()}
      >
        <Ionicons name="refresh" size={20} color={colors.onAccent} />
        <Text style={styles.btnPrimaryText}>Actualizar estado</Text>
      </Pressable>

      <InfoBanner>
        La impresión corre en la Mac del venue con Rollo 3×2.
      </InfoBanner>
    </View>
  );
}
