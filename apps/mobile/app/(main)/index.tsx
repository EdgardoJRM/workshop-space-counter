import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { fetchEvents } from "@/lib/api";
import { clearSession } from "@/lib/storage";
import type { MobileEvent } from "@/lib/types";
import { useBrand } from "@/lib/theme";

const EVENT_KEY = "hp_selected_event";

export async function getSelectedEventId(): Promise<string | null> {
  return AsyncStorage.getItem(EVENT_KEY);
}

export async function setSelectedEventId(id: string): Promise<void> {
  await AsyncStorage.setItem(EVENT_KEY, id);
}

export default function EventsScreen() {
  const { brand } = useBrand();
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEvents();
      setEvents(data.events);
      const saved = await getSelectedEventId();
      const pick =
        saved && data.events.some((e) => e.workshopDateId === saved)
          ? saved
          : data.events[0]?.workshopDateId ?? null;
      setSelectedId(pick);
      if (pick) await setSelectedEventId(pick);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    await clearSession();
    router.replace("/");
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={brand.accentColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{brand.displayName}</Text>
      <Text style={styles.sub}>{brand.appTitle} — Staff</Text>

      <FlatList
        data={events}
        keyExtractor={(item) => item.workshopDateId}
        renderItem={({ item }) => {
          const active = item.workshopDateId === selectedId;
          return (
            <Pressable
              style={[styles.row, active && { borderColor: brand.accentColor }]}
              onPress={() => {
                setSelectedId(item.workshopDateId);
                void setSelectedEventId(item.workshopDateId);
              }}
            >
              <Text style={styles.rowTitle}>{item.label}</Text>
              <Text style={styles.meta}>
                {item.checkedInCount}/{item.registrationCount} check-in
                {item.isToday ? " · Hoy" : ""}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay eventos activos.</Text>
        }
      />

      <Pressable style={styles.logout} onPress={() => void logout()}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f5f5f2" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { fontSize: 22, fontWeight: "700" },
  sub: { fontSize: 13, color: "#666", marginBottom: 16 },
  row: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 12, color: "#666", marginTop: 4 },
  empty: { textAlign: "center", color: "#888", marginTop: 24 },
  logout: { marginTop: 12, padding: 12, alignItems: "center" },
  logoutText: { color: "#888", fontSize: 14 },
});
