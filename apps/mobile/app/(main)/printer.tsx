import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBadge } from "@/components/StatusBadge";
import { printerStatus } from "@/lib/api";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

function MetricCell({
  icon,
  iconColor,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
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
      <Ionicons name={icon} size={22} color={iconColor} style={{ marginBottom: 8 }} />
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
              gap: 16,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 12,
                backgroundColor: "rgba(34, 32, 34, 0.06)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="print" size={40} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <StatusBadge
                label={status.connected ? "Conectada" : "Desconectada"}
                variant={status.connected ? "success" : "muted"}
              />
              <Text style={[styles.rowMeta, { marginTop: 8 }]}>
                Agente Mac · última vez {lastSeenLabel()}
              </Text>
            </View>
            {status.connected ? (
              <Ionicons name="wifi" size={22} color={colors.success} />
            ) : null}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -1 }}>
            <MetricCell
              icon="document-text-outline"
              iconColor={colors.accent}
              label="Pendientes"
              value={status.pending}
            />
            <MetricCell
              icon="sync-outline"
              iconColor={colors.link}
              label="En proceso"
              value={status.processing}
            />
            <MetricCell
              icon="print-outline"
              iconColor={colors.success}
              label="Impresas 24h"
              value={status.printedLast24h}
            />
            <MetricCell
              icon="checkmark-circle-outline"
              iconColor="#7c3aed"
              label="Cola"
              value="OK"
              valueColor={colors.success}
            />
          </View>

          <Pressable
            style={[styles.btnPrimary, styles.btnWithIcon, { marginTop: 20 }]}
            onPress={() => void load()}
          >
            <Ionicons name="refresh" size={20} color={colors.onAccent} />
            <Text style={styles.btnPrimaryText}>Actualizar estado</Text>
          </Pressable>

          <View
            style={{
              marginTop: 16,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              backgroundColor: webBrand.off,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <Ionicons name="information-circle-outline" size={20} color={colors.textSubtle} />
            <Text style={{ flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 19 }}>
              La impresión corre en la <Text style={{ fontWeight: "700", color: colors.text }}>Mac del venue</Text> con{" "}
              <Text style={{ fontWeight: "700", color: colors.text }}>Rollo 3×2</Text>
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.cardFlat}>
          <Text style={styles.subtitle}>No se pudo cargar el estado.</Text>
        </View>
      )}
    </View>
  );
}
