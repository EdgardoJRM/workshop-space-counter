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
import {
  fetchAdminDates,
  saveAdminDate,
  type AdminDateRow,
} from "@/lib/admin-api";
import { useSession } from "@/lib/session-context";
import { useAppTheme } from "@/lib/useAppTheme";

export default function AdminDatesScreen() {
  const { workshop } = useSession();
  const { colors, styles } = useAppTheme();
  const [rows, setRows] = useState<AdminDateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [capacity, setCapacity] = useState("25");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDates(workshop);
      setRows(data.dates);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [workshop]);

  useEffect(() => {
    void load();
  }, [load]);

  async function activate(id: string) {
    try {
      await saveAdminDate({ dateId: id, isActive: true, workshop });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  async function create() {
    try {
      await saveAdminDate({
        workshop,
        title: title.trim() || undefined,
        capacity: Number.parseInt(capacity, 10) || 25,
        isActive: rows.length === 0,
      });
      setShowCreate(false);
      setTitle("");
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <ScrollView style={styles.screenPadded}>
      <WorkshopPicker />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        style={[styles.btnOutline, { marginBottom: 16, alignSelf: "flex-start" }]}
        onPress={() => setShowCreate(!showCreate)}
      >
        <Text style={styles.btnOutlineText}>
          {showCreate ? "Cancelar" : "+ Nueva fecha"}
        </Text>
      </Pressable>

      {showCreate ? (
        <View style={[styles.card, { marginBottom: 16 }]}>
          <Text style={styles.label}>Título</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
          <Text style={styles.label}>Capacidad</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={capacity}
            onChangeText={setCapacity}
          />
          <Pressable style={styles.btnPrimary} onPress={() => void create()}>
            <Text style={styles.btnPrimaryText}>Crear fecha</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        rows.map((row) => (
          <View
            key={row.id}
            style={[
              styles.rowCard,
              row.isActive && styles.rowCardActive,
              { borderWidth: 1, borderColor: colors.border },
            ]}
          >
            <Text style={styles.rowTitle}>{row.title}</Text>
            <Text style={styles.rowMeta}>
              {new Date(row.startsAt).toLocaleString("es-PR")}
            </Text>
            <Text style={styles.rowMeta}>
              {row.soldCount}/{row.capacity} vendidos · {row.checkedInCount} check-in
            </Text>
            {row.isActive ? (
              <View style={[styles.badge, styles.badgeSuccess, { marginTop: 8 }]}>
                <Text style={[styles.badgeText, styles.badgeSuccessText]}>Activa</Text>
              </View>
            ) : (
              <Pressable
                style={[styles.btnSecondary, { marginTop: 10, alignSelf: "flex-start" }]}
                onPress={() => void activate(row.id)}
              >
                <Text style={styles.btnSecondaryText}>Activar</Text>
              </Pressable>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}
