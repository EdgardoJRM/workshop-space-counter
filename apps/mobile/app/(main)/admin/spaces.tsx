import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { WorkshopPicker } from "@/components/WorkshopPicker";
import { fetchSpaces, updateSpaces } from "@/lib/admin-api";
import { useSession } from "@/lib/session-context";
import { getWorkshopLabel } from "@/lib/workshops";
import { useAppTheme } from "@/lib/useAppTheme";

export default function AdminSpacesScreen() {
  const { workshop } = useSession();
  const { colors, styles } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSpaces(workshop);
      setAvailable(String(data.available));
      setUpdatedAt(data.updatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [workshop]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    const n = Number.parseInt(available, 10);
    if (!Number.isInteger(n) || n < 0) {
      setError("Indica un entero ≥ 0");
      return;
    }
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const data = await updateSpaces(workshop, n);
      setAvailable(String(data.available));
      setOk("Cupos actualizados");
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screenPadded} keyboardShouldPersistTaps="handled">
      <WorkshopPicker />
      <Text style={styles.title}>{getWorkshopLabel(workshop)}</Text>
      <Text style={[styles.subtitle, { marginBottom: 16 }]}>
        Valor que muestra el widget de cupos en ClickFunnels.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>Cupos disponibles</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={available}
            onChangeText={setAvailable}
          />
          {updatedAt ? (
            <Text style={[styles.rowMeta, { marginTop: 8 }]}>
              Actualizado: {new Date(updatedAt).toLocaleString("es-PR")}
            </Text>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {ok ? <Text style={styles.okText}>{ok}</Text> : null}
          <Pressable
            style={[styles.btnPrimary, saving && { opacity: 0.7 }]}
            onPress={() => void save()}
            disabled={saving}
          >
            <Text style={styles.btnPrimaryText}>
              {saving ? "Guardando…" : "Guardar cupos"}
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
