import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { checkinById, fetchRegistrations, reprintLabel } from "@/lib/api";
import { getSelectedEventId } from "./index";
import type { RegistrationRow } from "@/lib/types";
import { useAppTheme } from "@/lib/useAppTheme";

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
      <View style={styles.screenPadded}>
        <View style={styles.cardFlat}>
          <Text style={[styles.subtitle, { textAlign: "center" }]}>
            Selecciona un evento en la pestaña Evento.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenPadded}>
      <TextInput
        style={[styles.input, { marginBottom: 12, backgroundColor: colors.surface }]}
        placeholder="Buscar nombre o email"
        placeholderTextColor={colors.textSubtle}
        value={q}
        onChangeText={setQ}
      />

      {msg ? (
        <View
          style={[
            styles.cardFlat,
            {
              marginBottom: 12,
              paddingVertical: 10,
              backgroundColor: msg.startsWith("Error")
                ? "rgba(196, 71, 43, 0.08)"
                : "rgba(45, 106, 79, 0.08)",
            },
          ]}
        >
          <Text
            style={msg.startsWith("Error") ? styles.errorText : styles.okText}
          >
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
            <View style={[styles.rowCard, { borderWidth: 1, borderColor: colors.border }]}>
              <View style={{ flex: 1, marginBottom: item.checkedIn ? 0 : 10 }}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowMeta}>{item.email}</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <View
                    style={[
                      styles.badge,
                      item.checkedIn ? styles.badgeSuccess : undefined,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        item.checkedIn ? styles.badgeSuccessText : undefined,
                      ]}
                    >
                      {item.checkedIn ? "✓ Check-in" : "Pendiente"}
                    </Text>
                  </View>
                  {item.printStatus ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.printStatus}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {!item.checkedIn && (
                  <Pressable
                    style={styles.btnSecondary}
                    onPress={() => void onCheckin(item)}
                  >
                    <Text style={styles.btnSecondaryText}>Check-in</Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.btnOutline}
                  onPress={() => void onReprint(item)}
                >
                  <Text style={styles.btnOutlineText}>Label</Text>
                </Pressable>
              </View>
            </View>
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
