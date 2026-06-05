import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SectionCard } from "@/components/SectionCard";
import { SyncBanner } from "@/components/InfoBanner";
import { WorkshopPicker } from "@/components/WorkshopPicker";
import { fetchSpaces, updateSpaces } from "@/lib/admin-api";
import { useSession } from "@/lib/session-context";
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

  function step(delta: number) {
    const n = Number.parseInt(available, 10) || 0;
    setAvailable(String(Math.max(0, n + delta)));
  }

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
      await updateSpaces(workshop, n);
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

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <SectionCard icon="ticket-outline" title="Espacios disponibles">
          <Text style={{ fontSize: 48, fontWeight: "700", textAlign: "center", color: colors.text }}>
            {available || "0"}
          </Text>
          <Text style={[styles.rowMeta, { textAlign: "center", marginBottom: 20 }]}>
            Espacios disponibles (ClickFunnels)
          </Text>

          <Text style={[styles.label, { marginTop: 0 }]}>Actualizar cupos</Text>
          <Text style={[styles.subtitle, { marginBottom: 12 }]}>
            Ajusta la cantidad de espacios disponibles para este taller.
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable
              onPress={() => step(-1)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="remove" size={22} color={colors.text} />
            </Pressable>
            <TextInput
              style={[styles.input, { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "700" }]}
              keyboardType="number-pad"
              value={available}
              onChangeText={setAvailable}
            />
            <Pressable
              onPress={() => step(1)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="add" size={22} color={colors.text} />
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {ok ? <Text style={styles.okText}>{ok}</Text> : null}

          <Pressable
            style={[
              styles.btnPrimary,
              { flexDirection: "row", gap: 8, justifyContent: "center" },
              saving && { opacity: 0.7 },
            ]}
            onPress={() => void save()}
            disabled={saving}
          >
            <Ionicons name="save-outline" size={20} color={colors.onAccent} />
            <Text style={styles.btnPrimaryText}>
              {saving ? "Guardando…" : "Guardar cupos"}
            </Text>
          </Pressable>
        </SectionCard>
      )}

      {updatedAt ? (
        <SyncBanner
          label="Última sincronización con ClickFunnels"
          detail={`Actualizado ${new Date(updatedAt).toLocaleString("es-PR")}`}
        />
      ) : null}
    </ScrollView>
  );
}
