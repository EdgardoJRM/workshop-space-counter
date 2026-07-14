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
import { WorkshopDateTimePicker } from "@/components/WorkshopDateTimePicker";
import { WorkshopChips } from "@/components/WorkshopChips";
import {
  deleteAdminDate,
  fetchAdminDates,
  saveAdminDate,
  type AdminDateRow,
} from "@/lib/admin-api";
import { confirmDestructive } from "@/lib/confirm-alert";
import type { WorkshopSlug } from "@/lib/workshops";
import {
  joinWorkshopDatetimeLocal,
  parseWorkshopDatetimeLocal,
  splitWorkshopDatetimeLocal,
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

function templateRow(list: AdminDateRow[]): AdminDateRow | null {
  return (
    list.find((d) => d.isSelling) ??
    list.find((d) => d.isActive) ??
    list[list.length - 1] ??
    null
  );
}

function defaultStartsAt(from?: AdminDateRow | null): string {
  const base = new Date();
  base.setDate(base.getDate() + 14);
  base.setHours(10, 0, 0, 0);
  if (from) {
    const { time } = splitWorkshopDatetimeLocal(
      toWorkshopDatetimeLocalInput(from.startsAt)
    );
    const { date } = splitWorkshopDatetimeLocal(
      toWorkshopDatetimeLocalInput(base.toISOString())
    );
    return joinWorkshopDatetimeLocal(date, time);
  }
  return toWorkshopDatetimeLocalInput(base.toISOString());
}

export default function AdminDatesScreen() {
  const [workshopFilter, setWorkshopFilter] = useState<WorkshopSlug | "all">("all");
  const [createWorkshop, setCreateWorkshop] = useState<WorkshopSlug>("duplica-ventas");
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
      const data = await fetchAdminDates(
        workshopFilter === "all" ? null : workshopFilter
      );
      setRows(data.dates);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [workshopFilter]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openCreateForm = useCallback((source?: AdminDateRow | null) => {
    const src = source ?? templateRow(rows);
    setCreateForm({
      title: src?.title ?? "",
      startsAt: defaultStartsAt(src),
      venue: src?.venue ?? "",
      mapsUrl: src?.mapsUrl ?? "",
      capacity: src ? String(src.capacity) : "25",
    });
    setShowCreate(true);
    setEditingId(null);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
  }, [rows]);

  function openDuplicate(row: AdminDateRow) {
    const current = splitWorkshopDatetimeLocal(
      toWorkshopDatetimeLocalInput(row.startsAt)
    );
    const next = parseWorkshopDatetimeLocal(
      joinWorkshopDatetimeLocal(current.date, current.time)
    );
    if (next) next.setDate(next.getDate() + 7);

    setCreateForm({
      title: row.title,
      startsAt: next
        ? toWorkshopDatetimeLocalInput(next.toISOString())
        : defaultStartsAt(row),
      venue: row.venue ?? "",
      mapsUrl: row.mapsUrl ?? "",
      capacity: String(row.capacity),
    });
    setShowCreate(true);
    setEditingId(null);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => {
            if (showCreate) {
              setShowCreate(false);
            } else {
              openCreateForm();
            }
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
  }, [navigation, colors.accent, colors.onAccent, showCreate, openCreateForm]);

  async function activate(row: AdminDateRow) {
    try {
      await saveAdminDate({
        dateId: row.id,
        isActive: true,
        workshop: row.workshopSlug as WorkshopSlug,
      });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  async function setSelling(row: AdminDateRow) {
    try {
      await saveAdminDate({
        dateId: row.id,
        isSelling: true,
        workshop: row.workshopSlug as WorkshopSlug,
      });
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
      const workshopSlug =
        workshopFilter === "all" ? createWorkshop : workshopFilter;
      await saveAdminDate({
        workshop: workshopSlug,
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

  async function saveEdit(row: AdminDateRow) {
    try {
      const capacity = Number.parseInt(editForm.capacity, 10);
      const parsed = editForm.startsAt
        ? parseWorkshopDatetimeLocal(editForm.startsAt)
        : null;
      await saveAdminDate({
        dateId: row.id,
        workshop: row.workshopSlug as WorkshopSlug,
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
      <WorkshopChips
        value={workshopFilter}
        onChange={(slug) => {
          setWorkshopFilter(slug);
          if (slug !== "all") setCreateWorkshop(slug);
        }}
        showAll
      />
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
          {templateRow(rows) ? (
            <Text style={[styles.rowMeta, { marginBottom: 12 }]}>
              Datos copiados de la fecha en venta o del evento de hoy. Solo cambia la fecha.
            </Text>
          ) : null}
          {workshopFilter === "all" ? (
            <WorkshopChips
              value={createWorkshop}
              onChange={(slug) => {
                if (slug !== "all") setCreateWorkshop(slug);
              }}
            />
          ) : null}
          <Text style={styles.fieldLabel}>Título del evento</Text>
          <TextInput
            style={styles.input}
            value={createForm.title}
            onChangeText={(v) => setCreateForm((f) => ({ ...f, title: v }))}
          />
          <Text style={styles.fieldLabel}>Fecha y hora</Text>
          <WorkshopDateTimePicker
            value={createForm.startsAt}
            onChange={(startsAt) => setCreateForm((f) => ({ ...f, startsAt }))}
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
        Fechas {workshopFilter === "all" ? "de todos los talleres" : "del taller"}
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
                <WorkshopDateTimePicker
                  value={editForm.startsAt}
                  onChange={(startsAt) => setEditForm((f) => ({ ...f, startsAt }))}
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
                    onPress={() => void saveEdit(row)}
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
                  <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                    {row.isSelling ? (
                      <StatusBadge label="En venta" variant="warning" />
                    ) : null}
                    {row.isActive ? (
                      <StatusBadge label="Evento de hoy" variant="success" />
                    ) : null}
                  </View>
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
                  <Pressable
                    style={[styles.btnOutline, { flexDirection: "row", gap: 4 }]}
                    onPress={() => openDuplicate(row)}
                  >
                    <Ionicons name="copy-outline" size={14} color={colors.link} />
                    <Text style={[styles.btnOutlineText, { color: colors.link }]}>Duplicar</Text>
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
                      onPress={() => void activate(row)}
                    >
                      <Ionicons name="play-outline" size={14} color={colors.accent} />
                      <Text style={styles.btnOutlineText}>Evento de hoy</Text>
                    </Pressable>
                  ) : null}
                  {!row.isSelling ? (
                    <Pressable
                      style={[styles.btnOutline, { flexDirection: "row", gap: 4 }]}
                      onPress={() => void setSelling(row)}
                    >
                      <Ionicons name="cart-outline" size={14} color={colors.accent} />
                      <Text style={styles.btnOutlineText}>En venta</Text>
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
