import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { fetchEvents } from "@/lib/api";
import { clearSession } from "@/lib/storage";
import type { MobileEvent } from "@/lib/types";
import { useAppTheme } from "@/lib/useAppTheme";

const EVENT_KEY = "hp_selected_event";

export async function getSelectedEventId(): Promise<string | null> {
  return AsyncStorage.getItem(EVENT_KEY);
}

export async function setSelectedEventId(id: string): Promise<void> {
  await AsyncStorage.setItem(EVENT_KEY, id);
}

function EventRow({
  item,
  active,
  onSelect,
}: {
  item: MobileEvent;
  active: boolean;
  onSelect: () => void;
}) {
  const { colors, styles } = useAppTheme();

  return (
    <Pressable
      style={[styles.rowCard, active && styles.rowCardActive]}
      onPress={onSelect}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{item.label}</Text>
          <Text style={styles.rowMeta}>
            {item.checkedInCount}/{item.registrationCount} check-in
          </Text>
        </View>
        <View style={{ gap: 6, alignItems: "flex-end" }}>
          {item.isToday ? (
            <View style={[styles.badge, styles.badgeGold]}>
              <Text style={[styles.badgeText, { color: colors.text }]}>Hoy</Text>
            </View>
          ) : null}
          {active ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Activo</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function EventsScreen() {
  const { brand, colors, styles } = useAppTheme();
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
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screenPadded}>
      <View style={{ marginBottom: 16 }}>
        <Text style={styles.sectionLabel}>Tu negocio</Text>
        <Text style={styles.title}>{brand.displayName}</Text>
        <Text style={styles.subtitle}>{brand.appTitle} — Staff</Text>
      </View>

      <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>Eventos</Text>

      <FlatList
        data={events}
        keyExtractor={(item) => item.workshopDateId}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <EventRow
            item={item}
            active={item.workshopDateId === selectedId}
            onSelect={() => {
              setSelectedId(item.workshopDateId);
              void setSelectedEventId(item.workshopDateId);
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.cardFlat}>
            <Text style={[styles.subtitle, { textAlign: "center" }]}>
              No hay eventos activos.
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <Pressable style={styles.logout} onPress={() => void logout()}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}
