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
import { SearchField } from "@/components/SearchField";
import { StatusBadge } from "@/components/StatusBadge";
import { checkinById, fetchRegistrations, reprintLabel } from "@/lib/api";
import { getSelectedEventId } from "./index";
import type { RegistrationRow } from "@/lib/types";
import { useAppTheme } from "@/lib/useAppTheme";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
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
            <Text style={{ fontWeight: "700", color: colors.text }}>
              {initials(item.name || item.email)}
            </Text>
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
            <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
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
          <Pressable style={styles.btnOutline} onPress={onCheckin}>
            <Text style={[styles.btnOutlineText, { color: colors.accent }]}>
              Check-in manual
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          style={{
            padding: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          onPress={onReprint}
        >
          <Ionicons name="print-outline" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

export default function ListScreen() {
  const { colors, styles } = useAppTheme();
  const [eventId, setEventId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const id = await getSelectedEventId();
    setEventId(id);
    if (!id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchRegistrations(id, q.trim() || undefined);
      setRows(data.registrations);
    } finally {
      setLoading(false);
    }
  }, [q]);

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
      <View style={[styles.screenPadded, { justifyContent: "center", flex: 1 }]}>
        <EmptyState
          title="Aún no hay nada aquí"
          message="Selecciona un evento en la pestaña Evento."
          hintArrowToEvento
        />
      </View>
    );
  }

  return (
    <View style={styles.screenPadded}>
      <SearchField value={q} onChangeText={setQ} />

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
        />
      )}
    </View>
  );
}
