import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { fetchPendingGuestInfo } from "@/lib/admin-api";
import { useAppTheme } from "@/lib/useAppTheme";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-PR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function GuestInfoScreen() {
  const { colors, styles } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<
    {
      id: string;
      buyerName: string;
      buyerEmail: string;
      workshopLabel: string;
      slotsNeeded: number;
      slotsCompleted: number;
      expiresAt: string;
    }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPendingGuestInfo();
      setRows(data.pending);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView style={styles.screenPadded} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={[styles.subtitle, { marginBottom: 16, lineHeight: 22 }]}>
        Compradores con boletos extra que aún no completaron los datos de sus invitados. El
        comprador recibe un email con el enlace al formulario.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : rows.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>No hay invitados pendientes.</Text>
        </View>
      ) : (
        rows.map((row) => (
          <View key={row.id} style={[styles.card, { marginBottom: 12 }]}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>
              {row.buyerName}
            </Text>
            <Text style={[styles.subtitle, { marginTop: 4 }]}>{row.buyerEmail}</Text>
            <Text style={[styles.subtitle, { marginTop: 8 }]}>{row.workshopLabel}</Text>
            <Text style={[styles.rowMeta, { marginTop: 8 }]}>
              Faltan {row.slotsNeeded - row.slotsCompleted} de {row.slotsNeeded} invitado(s)
            </Text>
            <Text style={styles.rowMeta}>Vence {formatWhen(row.expiresAt)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
