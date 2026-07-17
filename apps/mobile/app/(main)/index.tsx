import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { EventDatePicker } from "@/components/EventDatePicker";
import { IconCircle } from "@/components/IconCircle";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { useSelectedEvent } from "@/lib/event-context";
import { clearSession } from "@/lib/storage";
import type { MobileEvent } from "@/lib/types";
import { useAppTheme } from "@/lib/useAppTheme";

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-PR", {
      dateStyle: "full",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function FeaturedEventCard({ item }: { item: MobileEvent }) {
  const { colors, styles } = useAppTheme();

  return (
    <View
      style={[
        styles.rowCard,
        styles.rowCardActive,
        { borderWidth: 2, padding: 18 },
      ]}
    >
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
        <IconCircle name="calendar-outline" variant="gold" size={48} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { fontSize: 17 }]}>{item.label}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {item.isToday ? <StatusBadge label="Hoy" variant="warning" /> : null}
            {item.isActive ? <StatusBadge label="Evento de hoy" variant="success" /> : null}
            <StatusBadge label="Seleccionado" variant="gold" />
          </View>
        </View>
      </View>

      <Text style={{ fontSize: 28, fontWeight: "700", color: colors.link }}>
        {item.checkedInCount}
        <Text style={{ fontSize: 16, fontWeight: "500", color: colors.textMuted }}>
          {" "}
          / {item.registrationCount} check-in
        </Text>
      </Text>
      <ProgressBar
        value={item.checkedInCount}
        max={item.registrationCount}
        fillColor={colors.accent}
      />

      <View style={{ marginTop: 14, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={styles.rowMeta}>{formatEventDate(item.startsAt)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function EventsScreen() {
  const { colors, styles } = useAppTheme();
  const {
    loaded,
    events,
    selectedEvent,
    selectedEventId,
    selectEvent,
    refreshEvents,
  } = useSelectedEvent();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshEvents();
    } finally {
      setRefreshing(false);
    }
  }, [refreshEvents]);

  async function logout() {
    await clearSession();
    router.replace("/");
  }

  if (!loaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screenPadded}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
      }
    >
      <Pressable
        onPress={() => void logout()}
        style={{
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          marginBottom: 16,
        }}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.textMuted} />
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textMuted }}>
          Cerrar sesión
        </Text>
      </Pressable>

      {events.length > 0 ? (
        <EventDatePicker
          events={events}
          selectedEventId={selectedEventId}
          onSelect={(id) => void selectEvent(id)}
        />
      ) : null}

      {selectedEvent ? (
        <FeaturedEventCard item={selectedEvent} />
      ) : (
        <View style={styles.cardFlat}>
          <Text style={[styles.subtitle, { textAlign: "center" }]}>
            No hay eventos para check-in hoy. Configura fechas en pass.edgardohernandez.com/admin
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
