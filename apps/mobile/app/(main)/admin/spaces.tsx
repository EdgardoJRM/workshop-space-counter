import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { IconCircle } from "@/components/IconCircle";
import { SyncBanner } from "@/components/InfoBanner";
import { SectionCard } from "@/components/SectionCard";
import { WorkshopDropdown } from "@/components/WorkshopDropdown";
import { fetchSpaces, updateSpaces } from "@/lib/admin-api";
import { useSession } from "@/lib/session-context";
import { useAppTheme } from "@/lib/useAppTheme";

const SLIDER_MAX = 25;

function formatRelative(iso: string): string {
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `Actualizado hace ${sec} s`;
  const min = Math.round(sec / 60);
  if (min < 120) return `Actualizado hace ${min} min`;
  return `Actualizado ${new Date(iso).toLocaleString("es-PR")}`;
}

export default function AdminSpacesScreen() {
  const { workshop } = useSession();
  const { colors, styles } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSpaces(workshop);
      setAvailable(data.available);
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
    if (!Number.isInteger(available) || available < 0) {
      setError("Indica un entero ≥ 0");
      return;
    }
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await updateSpaces(workshop, available);
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
      <WorkshopDropdown />

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <SectionCard>
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <IconCircle name="people-outline" variant="gold" size={56} />
            <Text
              style={{
                fontSize: 48,
                fontWeight: "700",
                color: colors.text,
                marginTop: 12,
              }}
            >
              {available}
            </Text>
            <Text style={[styles.rowMeta, { textAlign: "center" }]}>
              Espacios disponibles
            </Text>
            <Text style={[styles.subtitle, { textAlign: "center" }]}>(ClickFunnels)</Text>
          </View>

          <View style={styles.divider} />

          <Text style={[styles.title, { fontSize: 17 }]}>Actualizar cupos</Text>
          <Text style={[styles.subtitle, { marginBottom: 16 }]}>
            Ajusta la cantidad de espacios disponibles para este taller.
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={() => setAvailable((v) => Math.max(0, v - 1))}
              style={styles.stepperBtn}
            >
              <Ionicons name="remove" size={22} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Slider
                minimumValue={0}
                maximumValue={SLIDER_MAX}
                step={1}
                value={Math.min(available, SLIDER_MAX)}
                onValueChange={(v) => setAvailable(Math.round(v))}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.accent}
              />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={styles.subtitle}>0</Text>
                <Text style={{ fontWeight: "700", color: colors.text }}>{available}</Text>
                <Text style={styles.subtitle}>{SLIDER_MAX}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => setAvailable((v) => Math.min(SLIDER_MAX, v + 1))}
              style={styles.stepperBtn}
            >
              <Ionicons name="add" size={22} color={colors.text} />
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {ok ? <Text style={styles.okText}>{ok}</Text> : null}

          <Pressable
            style={[styles.btnPrimary, styles.btnWithIcon, saving && { opacity: 0.7 }]}
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
          detail={formatRelative(updatedAt)}
        />
      ) : null}
    </ScrollView>
  );
}
