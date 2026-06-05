import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { checkinById, fetchRegistrations, reprintLabel } from "@/lib/api";
import { getSelectedEventId } from "./index";
import type { RegistrationRow } from "@/lib/types";
import { useBrand } from "@/lib/theme";

export default function ListScreen() {
  const { brand } = useBrand();
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

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Buscar nombre o email"
        value={q}
        onChangeText={setQ}
      />
      {msg && <Text style={styles.msg}>{msg}</Text>}
      {loading ? (
        <ActivityIndicator color={brand.accentColor} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.email}>{item.email}</Text>
                <Text style={styles.meta}>
                  {item.checkedIn ? "✓ Check-in" : "Pendiente"}
                  {item.printStatus ? ` · ${item.printStatus}` : ""}
                </Text>
              </View>
              {!item.checkedIn && (
                <Pressable
                  style={[styles.btn, { backgroundColor: brand.primaryColor }]}
                  onPress={() => void onCheckin(item)}
                >
                  <Text style={styles.btnText}>Check-in</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.btn, { backgroundColor: brand.accentColor }]}
                onPress={() => void onReprint(item)}
              >
                <Text style={styles.btnTextDark}>Label</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#f5f5f2" },
  search: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  msg: { fontSize: 13, color: "#0a7a32", marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  name: { fontSize: 15, fontWeight: "600" },
  email: { fontSize: 12, color: "#666" },
  meta: { fontSize: 11, color: "#888", marginTop: 2 },
  btn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  btnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  btnTextDark: { color: "#111", fontSize: 12, fontWeight: "600" },
});
