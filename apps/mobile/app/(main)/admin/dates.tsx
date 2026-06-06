import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ScrollView as ScrollViewRef,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ProgressBarSuccess } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkshopDropdown } from "@/components/WorkshopDropdown";
import {
  deleteAdminDate,
  fetchAdminDates,
  saveAdminDate,
  type AdminDateRow,
} from "@/lib/admin-api";
import { confirmDestructive } from "@/lib/confirm-alert";
import { useSession } from "@/lib/session-context";
import {
  parseWorkshopDatetimeLocal,
  toWorkshopDatetimeLocalInput,
} from "@/lib/workshop-datetime";
import { useAppTheme } from "@/lib/useAppTheme";

const emptyForm = {
  title: "",
  startsAt: "",
  venue: "",
  mapsUrl: "",
  capacity: "25",
};

export default function AdminDatesScreen() {
  const { workshop } = useSession();
  const { colors, styles } = useAppTheme();
  const navigation = useNavigation();
  const [rows, setRows] = useState<AdminDateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const scrollRef = useRef<ScrollViewRef>(null);

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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => {
            setShowCreate((v) => !v);
            setEditingId(null);
            setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: colors.accent,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            marginRight: 8,
          }}
        >
          <Ionicons name="add" size={16} color={colors.onAccent} />
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.onAccent }}>
            Nueva fecha
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, colors.accent, colors.onAccent]);

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
      const capacity = Number.parseInt(createForm.capacity, 10) || 25;
      const parsed = createForm.startsAt
        ? parseWorkshopDatetimeLocal(createForm.startsAt)
        : null;
      await saveAdminDate({
        workshop,
        title: createForm.title.trim() || undefined,
        startsAt: parsed?.toISOString(),
        venue: createForm.venue.trim() || undefined,
        mapsUrl: createForm.mapsUrl.trim() || undefined,
        capacity,
        isActive: rows.length === 0,
      });
      setShowCreate(false);
      setCreateForm(emptyForm);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  function startEdit(row: AdminDateRow) {
    setShowCreate(false);
    setEditingId(row.id);
    setEditForm({
      title: row.title,
      startsAt: toWorkshopDatetimeLocalInput(row.startsAt),
      venue: row.venue ?? "",
      mapsUrl: row.mapsUrl ?? "",
      capacity: String(row.capacity),
    });
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
  }

  async function saveEdit(dateId: string) {
    try {
      const capacity = Number.parseInt(editForm.capacity, 10);
      const parsed = editForm.startsAt
        ? parseWorkshopDatetimeLocal(editForm.startsAt)
        : null;
      await saveAdminDate({
        dateId,
        workshop,
        title: editForm.title.trim(),
        startsAt: parsed?.toISOString(),
        venue: editForm.venue.trim(),
        mapsUrl: editForm.mapsUrl.trim(),
        capacity: Number.isInteger(capacity) ? capacity : undefined,
      });
      setEditingId(null);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  function removeDate(row: AdminDateRow) {
    confirmDestructive(
      "Eliminar fecha",
      row.soldCount > 0
        ? "Esta fecha tiene registros y no se puede eliminar."
        : `¿Eliminar "${row.title}"? Esta acción no se puede deshacer.`,
      async () => {
        if (row.soldCount > 0) return;
        try {
          await deleteAdminDate(row.id);
          if (editingId === row.id) setEditingId(null);
          void load();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Error");
        }
      }
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screenPadded}
      keyboardShouldPersistTaps="handled"
    >
      <WorkshopDropdown />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {showCreate ? (
        <View style={[styles.card, { marginBottom: 16 }]}>
          <Pressable
            onPress={() => setShowCreate(false)}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={[styles.title, { fontSize: 17 }]}>Crear nueva fecha</Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSubtle} />
          </Pressable>
          <Text style={styles.fieldLabel}>Título del evento</Text>
          <TextInput
            style={styles.input}
            value={createForm.title}
            onChangeText={(v) => setCreateForm((f) => ({ ...f, title: v }))}
          />
          <Text style={styles.fieldLabel}>Fecha y hora</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-06-15T14:00"
            placeholderTextColor={colors.textSubtle}
            value={createForm.startsAt}
            onChangeText={(v) => setCreateForm((f) => ({ ...f, startsAt: v }))}
          />
          <Text style={styles.label}>Lugar</Text>
          <TextInput
            style={styles.input}
            value={createForm.venue}
            onChangeText={(v) => setCreateForm((f) => ({ ...f, venue: v }))}
          />
          <Text style={styles.fieldLabel}>Maps URL (opcional)</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={createForm.mapsUrl}
            onChangeText={(v) => setCreateForm((f) => ({ ...f, mapsUrl: v }))}
          />
          <Text style={styles.label}>Capacidad</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={createForm.capacity}
            onChangeText={(v) => setCreateForm((f) => ({ ...f, capacity: v }))}
          />
          <Pressable
            style={[styles.btnPrimary, styles.btnWithIcon]}
            onPress={() => void create()}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.onAccent} />
            <Text style={styles.btnPrimaryText}>Crear fecha</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={[styles.title, { fontSize: 17, marginBottom: 12, marginTop: 4 }]}>
        Fechas del taller
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        rows.map((row) => (
          <View
            key={row.id}
            style={[
              styles.rowCard,
              row.isActive && styles.rowCardActive,
              { borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
            ]}
          >
            {editingId === row.id ? (
              <>
                <Text style={styles.sectionLabel}>Editar fecha</Text>
                <Text style={styles.label}>Título</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.title}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, title: v }))}
                />
                <Text style={styles.label}>Fecha y hora</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.startsAt}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, startsAt: v }))}
                />
                <Text style={styles.label}>Lugar</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.venue}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, venue: v }))}
                />
                <Text style={styles.label}>Google Maps</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.mapsUrl}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, mapsUrl: v }))}
                />
                <Text style={styles.label}>Capacidad</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={editForm.capacity}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, capacity: v }))}
                />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <Pressable
                    style={[styles.btnPrimary, { flex: 1, marginTop: 0 }]}
                    onPress={() => void saveEdit(row.id)}
                  >
                    <Text style={styles.btnPrimaryText}>Guardar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btnOutline, { marginTop: 0 }]}
                    onPress={() => setEditingId(null)}
                  >
                    <Text style={styles.btnOutlineText}>Cancelar</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <StatusBadge
                    label={row.isActive ? "Activa" : "Inactiva"}
                    variant={row.isActive ? "success" : "muted"}
                  />
                  <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
                </View>
                <Text style={[styles.rowTitle, { marginTop: 10 }]}>{row.title}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSubtle} />
                  <Text style={styles.rowMeta}>
                    {new Date(row.startsAt).toLocaleDateString("es-PR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <Ionicons name="time-outline" size={14} color={colors.textSubtle} />
                  <Text style={styles.rowMeta}>
                    {new Date(row.startsAt).toLocaleTimeString("es-PR", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                {row.venue ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <Ionicons name="location-outline" size={14} color={colors.textSubtle} />
                    <Text style={styles.rowMeta}>{row.venue}</Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <Ionicons name="people-outline" size={14} color={colors.textSubtle} />
                  <Text style={styles.rowMeta}>
                    {row.soldCount} / {row.capacity} vendidos
                  </Text>
                </View>
                <View style={{ marginTop: 4 }}>
                  <ProgressBarSuccess value={row.soldCount} max={row.capacity || 1} />
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <Pressable
                    style={[styles.btnOutline, { flexDirection: "row", gap: 4 }]}
                    onPress={() => startEdit(row)}
                  >
                    <Ionicons name="pencil-outline" size={14} color={colors.link} />
                    <Text style={[styles.btnOutlineText, { color: colors.link }]}>Editar</Text>
                  </Pressable>
                  {row.soldCount === 0 && row.checkedInCount === 0 ? (
                    <Pressable
                      style={[styles.btnDanger, { flexDirection: "row", gap: 4 }]}
                      onPress={() => removeDate(row)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#dc2626" />
                      <Text style={styles.btnDangerText}>Eliminar</Text>
                    </Pressable>
                  ) : !row.isActive ? (
                    <Pressable
                      style={[styles.btnOutline, { flexDirection: "row", gap: 4 }]}
                      onPress={() => void activate(row.id)}
                    >
                      <Ionicons name="play-outline" size={14} color={colors.accent} />
                      <Text style={styles.btnOutlineText}>Activar</Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}
