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
import { WorkshopPicker } from "@/components/WorkshopPicker";
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
  const [rows, setRows] = useState<AdminDateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

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
    setEditingId(row.id);
    setEditForm({
      title: row.title,
      startsAt: toWorkshopDatetimeLocalInput(row.startsAt),
      venue: row.venue ?? "",
      mapsUrl: row.mapsUrl ?? "",
      capacity: String(row.capacity),
    });
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
    <ScrollView style={styles.screenPadded} keyboardShouldPersistTaps="handled">
      <WorkshopPicker />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        style={[
          styles.btnPrimary,
          {
            marginBottom: 16,
            alignSelf: "flex-end",
            paddingHorizontal: 16,
            paddingVertical: 10,
            marginTop: 0,
            flexDirection: "row",
            gap: 6,
          },
        ]}
        onPress={() => setShowCreate(!showCreate)}
      >
        <Ionicons name="add" size={18} color={colors.onAccent} />
        <Text style={[styles.btnPrimaryText, { fontSize: 14 }]}>
          {showCreate ? "Cancelar" : "Nueva fecha"}
        </Text>
      </Pressable>

      {showCreate ? (
        <View style={[styles.card, { marginBottom: 16 }]}>
          <Text style={styles.sectionLabel}>Nueva fecha</Text>
          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            value={createForm.title}
            onChangeText={(v) => setCreateForm((f) => ({ ...f, title: v }))}
          />
          <Text style={styles.label}>Fecha y hora (AAAA-MM-DDTHH:mm)</Text>
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
          <Text style={styles.label}>Google Maps (URL)</Text>
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
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowMeta}>
                  {new Date(row.startsAt).toLocaleString("es-PR")}
                </Text>
                {row.venue ? <Text style={styles.rowMeta}>{row.venue}</Text> : null}
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
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <Pressable style={styles.btnOutline} onPress={() => startEdit(row)}>
                    <Text style={styles.btnOutlineText}>Editar</Text>
                  </Pressable>
                  {row.soldCount === 0 && row.checkedInCount === 0 ? (
                    <Pressable style={styles.btnDanger} onPress={() => removeDate(row)}>
                      <Text style={styles.btnDangerText}>Eliminar</Text>
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
