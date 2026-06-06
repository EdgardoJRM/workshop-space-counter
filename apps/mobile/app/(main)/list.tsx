import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "@/components/EmptyState";
import { SelectedEventBanner } from "@/components/SelectedEventBanner";
import { SearchField } from "@/components/SearchField";
import { StatusBadge } from "@/components/StatusBadge";
import { checkinById, fetchRegistrations, reprintLabel } from "@/lib/api";
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
  onCheckin,
  onReprint,
}: {
  item: RegistrationRow;
  onCheckin: () => void;
  onReprint: () => void;
}) {
  const { colors, styles } = useAppTheme();
  const checkinTime = formatCheckinTime(item.checkedInAt);

  return (
    <View
      style={[
        styles.rowCard,
        { borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
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
          {item.checkedIn ? (
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
            onPress={onCheckin}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.accent }}>
              Check-in manual
            </Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              style={{
                padding: 10,
                borderRadius: 10,
                backgroundColor: webBrand.off,
              }}
              onPress={onReprint}
            >
              <Ionicons name="print-outline" size={20} color={colors.textMuted} />
            </Pressable>
            <Pressable
              style={{
                padding: 10,
                borderRadius: 10,
                backgroundColor: webBrand.off,
              }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

export default function ListScreen() {
  const { colors, styles } = useAppTheme();
  const { selectedEventId: eventId } = useSelectedEvent();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchRegistrations(eventId, q.trim() || undefined);
      setRows(data.registrations);
    } finally {
      setLoading(false);
    }
  }, [q, eventId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  async function onCheckin(reg: RegistrationRow) {
    if (!eventId || reg.checkedIn) return;
    setMsg(null);
    try {
      const res = await checkinById(reg.id, eventId);
      setMsg(
        res.ok
          ? `Check-in: ${res.attendeeName}`
          : `Error: ${(res as { error?: string }).error}`
      );
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  async function onReprint(reg: RegistrationRow) {
    setMsg(null);
    try {
      await reprintLabel(reg.id);
      setMsg(`Reimpresión en cola: ${reg.name}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
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
        }}
      >
        <Text style={styles.rowMeta}>
          {rows.length} asistentes · Actualizado ahora
        </Text>
        <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="share-outline" size={16} color={colors.link} />
          <Text style={styles.link}>Exportar</Text>
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

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (rows.length > 0) {
              setLoadingMore(true);
              setTimeout(() => setLoadingMore(false), 800);
            }
          }}
          renderItem={({ item }) => (
            <AttendeeRow
              item={item}
              onCheckin={() => void onCheckin(item)}
              onReprint={() => void onReprint(item)}
            />
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={[styles.subtitle, { textAlign: "center", marginTop: 24 }]}>
              Sin resultados.
            </Text>
          }
          ListFooterComponent={
            loadingMore && rows.length > 0 ? (
              <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, padding: 16 }}>
                <ActivityIndicator size="small" color={colors.textSubtle} />
                <Text style={styles.rowMeta}>Cargando más asistentes…</Text>
              </View>
            ) : null
          }
        />
      )}
      </View>
    </View>
  );
}
