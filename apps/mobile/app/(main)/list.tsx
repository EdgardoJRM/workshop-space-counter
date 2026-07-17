import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "@/components/EmptyState";
import {
  AddRegistrationModal,
  RegistrationDetailSheet,
} from "@/components/RegistrationSheets";
import { SelectedEventBanner } from "@/components/SelectedEventBanner";
import { SearchField } from "@/components/SearchField";
import { StatusBadge } from "@/components/StatusBadge";
import {
  cancelRegistration,
  checkinById,
  createRegistration,
  fetchRegistrations,
  reprintLabel,
  updateRegistration,
} from "@/lib/api";
import { useSelectedEvent } from "@/lib/event-context";
import type { RegistrationRow } from "@/lib/types";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

function formatCheckinTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("es-PR", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function AttendeeRow({
  item,
  busy,
  onPressCard,
  onCheckin,
  onReprint,
}: {
  item: RegistrationRow;
  busy: boolean;
  onPressCard: () => void;
  onCheckin: () => void;
  onReprint: () => void;
}) {
  const { colors, styles } = useAppTheme();
  const checkinTime = formatCheckinTime(item.checkedInAt);

  return (
    <Pressable
      onPress={onPressCard}
      disabled={busy}
      style={({ pressed }) => [
        styles.rowCard,
        {
          borderWidth: 1,
          borderColor: pressed ? colors.link : colors.border,
          marginBottom: 10,
          opacity: busy ? 0.65 : 1,
          backgroundColor: pressed ? "rgba(40, 133, 210, 0.06)" : colors.surface,
        },
      ]}
    >
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: item.checkedIn
              ? "rgba(45, 106, 79, 0.15)"
              : "rgba(255, 201, 7, 0.35)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : item.checkedIn ? (
            <Ionicons name="checkmark" size={22} color={colors.success} />
          ) : (
            <Ionicons name="time-outline" size={22} color="#b45309" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <Text style={styles.rowTitle}>{item.name || item.email}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {checkinTime ? (
                <Text style={{ fontSize: 12, color: colors.textSubtle }}>{checkinTime}</Text>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
            </View>
          </View>
          <Text style={styles.rowMeta}>{item.email}</Text>
          <View style={{ marginTop: 8 }}>
            <StatusBadge
              label={item.checkedIn ? "Check-in" : "Pendiente"}
              variant={item.checkedIn ? "success" : "gold"}
            />
          </View>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginTop: 12,
          justifyContent: "flex-end",
          flexWrap: "wrap",
        }}
      >
        {!item.checkedIn ? (
          <Pressable
            style={{
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderWidth: 1.5,
              borderColor: colors.accent,
            }}
            onPress={(e) => {
              e.stopPropagation?.();
              onCheckin();
            }}
            disabled={busy}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.accent }}>
              {busy ? "Procesando…" : "Check-in manual"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: webBrand.off,
            }}
            onPress={(e) => {
              e.stopPropagation?.();
              onReprint();
            }}
            disabled={busy}
          >
            <Ionicons name="print-outline" size={18} color={colors.textMuted} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}>
              Reimprimir
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

export default function ListScreen() {
  const { colors, styles } = useAppTheme();
  const { selectedEventId: eventId, selectedEvent, events } = useSelectedEvent();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [detailReg, setDetailReg] = useState<RegistrationRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [formBusy, setFormBusy] = useState(false);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!eventId) {
        setRows([]);
        setInitialLoading(false);
        return;
      }

      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setInitialLoading(true);
      }

      try {
        const data = await fetchRegistrations(eventId, q.trim() || undefined);
        setRows(data.registrations);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "No se pudo cargar la lista");
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [q, eventId]
  );

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  async function onCheckin(reg: RegistrationRow) {
    if (!eventId || reg.checkedIn || busyId) return;
    setBusyId(reg.id);
    setMsg(null);

    try {
      const res = (await checkinById(reg.id, eventId)) as {
        ok?: boolean;
        error?: string;
        attendeeName?: string;
        status?: string;
        printJobQueued?: boolean;
        printError?: string;
      };

      if (res.ok) {
        const name = res.attendeeName ?? reg.name;
        setRows((prev) =>
          prev.map((r) =>
            r.id === reg.id
              ? { ...r, checkedIn: true, checkedInAt: new Date().toISOString() }
              : r
          )
        );
        if (res.status === "already_checked_in") {
          setMsg(`Ya registrado: ${name}`);
        } else if (res.printError) {
          setMsg(`Check-in: ${name} — Falló: ${res.printError}`);
        } else if (res.printJobQueued === false) {
          setMsg(`Check-in: ${name} — Impreso`);
        } else {
          setMsg(`Check-in: ${name} — Imprimiendo…`);
        }
        void load({ silent: true });
      } else {
        setMsg(`Error: ${res.error ?? "Check-in fallido"}`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  async function onReprint(reg: RegistrationRow) {
    if (busyId) return;
    setBusyId(reg.id);
    setMsg(null);
    try {
      await reprintLabel(reg.id);
      setMsg(`Reimpresión en cola: ${reg.name || reg.email}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  async function onCreatePerson(input: { name: string; email: string; phone: string }) {
    if (!eventId || !selectedEvent || formBusy) return;
    if (!input.email.includes("@")) {
      setMsg("Error: Email inválido");
      return;
    }

    setFormBusy(true);
    setMsg(null);
    try {
      const res = await createRegistration({
        workshopDateId: eventId,
        workshopSlug: selectedEvent.workshopSlug,
        email: input.email,
        name: input.name || undefined,
        phone: input.phone || undefined,
      });
      setShowAdd(false);
      setMsg(
        res.duplicate
          ? `Ya existía: ${input.email}`
          : `Registro creado: ${input.name || input.email}`
      );
      void load({ silent: true });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error al crear");
    } finally {
      setFormBusy(false);
    }
  }

  async function onSavePerson(input: {
    name: string;
    email: string;
    phone: string;
    workshopDateId: string;
  }) {
    if (!detailReg || !eventId || formBusy) return;
    if (!input.email.includes("@")) {
      setMsg("Error: Email inválido");
      return;
    }

    setFormBusy(true);
    setMsg(null);
    try {
      await updateRegistration({
        registrationId: detailReg.id,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        workshopDateId:
          input.workshopDateId !== eventId ? input.workshopDateId : undefined,
      });
      setDetailReg(null);
      setMsg("Cambios guardados");
      void load({ silent: true });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setFormBusy(false);
    }
  }

  function onCancelPerson() {
    if (!detailReg || formBusy) return;
    Alert.alert(
      "Cancelar registro",
      `¿Cancelar a ${detailReg.name || detailReg.email}? Dejará de aparecer en la lista.`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Sí, cancelar",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setFormBusy(true);
              try {
                await cancelRegistration(detailReg.id);
                setDetailReg(null);
                setMsg("Registro cancelado");
                void load({ silent: true });
              } catch (e) {
                setMsg(e instanceof Error ? e.message : "Error al cancelar");
              } finally {
                setFormBusy(false);
              }
            })();
          },
        },
      ]
    );
  }

  if (!eventId) {
    return (
      <View style={{ flex: 1 }}>
        <SelectedEventBanner />
        <View style={[styles.screenPadded, { justifyContent: "center", flex: 1 }]}>
          <EmptyState hintArrowToEvento />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SelectedEventBanner />
      <View style={[styles.screenPadded, { flex: 1 }]}>
        <SearchField value={q} onChangeText={setQ} placeholder="Buscar nombre o email…" />

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            gap: 8,
          }}
        >
          <Text style={[styles.rowMeta, { flex: 1 }]}>
            {rows.length} asistentes
            {refreshing ? " · Actualizando…" : " · Toca para detalle"}
          </Text>
          <Pressable
            style={[styles.btnPrimary, { paddingHorizontal: 14, paddingVertical: 10 }]}
            onPress={() => setShowAdd(true)}
          >
            <Text style={[styles.btnPrimaryText, { fontSize: 13 }]}>Añadir</Text>
          </Pressable>
        </View>

        {msg ? (
          <View
            style={[
              styles.cardFlat,
              {
                marginBottom: 12,
                backgroundColor: msg.startsWith("Error")
                  ? "rgba(196, 71, 43, 0.08)"
                  : "rgba(45, 106, 79, 0.08)",
              },
            ]}
          >
            <Text style={msg.startsWith("Error") ? styles.errorText : styles.okText}>
              {msg}
            </Text>
          </View>
        ) : null}

        {initialLoading && rows.length === 0 ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => void load({ silent: true })}
            renderItem={({ item }) => (
              <AttendeeRow
                item={item}
                busy={busyId === item.id}
                onPressCard={() => setDetailReg(item)}
                onCheckin={() => void onCheckin(item)}
                onReprint={() => void onReprint(item)}
              />
            )}
            contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
            ListEmptyComponent={
              <Text style={[styles.subtitle, { textAlign: "center", marginTop: 24 }]}>
                Sin resultados.
              </Text>
            }
          />
        )}
      </View>

      <RegistrationDetailSheet
        visible={detailReg !== null}
        registration={detailReg}
        events={events}
        currentEventId={eventId}
        busy={formBusy || busyId === detailReg?.id}
        onClose={() => setDetailReg(null)}
        onSave={(input) => void onSavePerson(input)}
        onCancelRegistration={onCancelPerson}
        onCheckin={() => {
          if (detailReg) void onCheckin(detailReg);
        }}
        onReprint={() => {
          if (detailReg) void onReprint(detailReg);
        }}
      />

      <AddRegistrationModal
        visible={showAdd}
        busy={formBusy}
        onClose={() => setShowAdd(false)}
        onCreate={(input) => void onCreatePerson(input)}
      />
    </View>
  );
}
