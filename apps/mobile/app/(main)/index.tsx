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

function FeaturedEventCard({
  item,
  onSelect,
}: {
  item: MobileEvent;
  onSelect: () => void;
}) {
  const { colors, styles } = useAppTheme();

  return (
    <Pressable
      onPress={onSelect}
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

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          marginTop: 14,
          paddingTop: 12,
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Text style={styles.link}>Ver detalles</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.link} />
      </View>
    </Pressable>
  );
}

function OtherEventRow({
  item,
  onSelect,
}: {
  item: MobileEvent;
  onSelect: () => void;
}) {
  const { colors, styles } = useAppTheme();

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.rowCard,
        {
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        },
      ]}
    >
      <IconCircle name="calendar-outline" variant="blue" size={40} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSubtle} />
          <Text style={styles.rowMeta}>{formatEventDate(item.startsAt)}</Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.link }}>
          {item.checkedInCount}/{item.registrationCount}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
      </View>
    </Pressable>
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

  const others = events.filter((e) => e.workshopDateId !== selectedEventId);

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

      {selectedEvent ? (
        <FeaturedEventCard
          item={selectedEvent}
          onSelect={() => void selectEvent(selectedEvent.workshopDateId)}
        />
      ) : (
        <View style={styles.cardFlat}>
          <Text style={[styles.subtitle, { textAlign: "center" }]}>
            No hay eventos para check-in hoy. Configura fechas en pass.edgardohernandez.com/admin
          </Text>
        </View>
      )}

      {others.length > 0 ? (
        <>
          <Text style={[styles.title, { fontSize: 18, marginTop: 24, marginBottom: 12 }]}>
            Otras fechas
          </Text>
          <Text style={[styles.subtitle, { marginBottom: 12 }]}>
            Toca una fecha para usarla en Escanear, Lista e Impresora.
          </Text>
          {others.map((item) => (
            <OtherEventRow
              key={item.workshopDateId}
              item={item}
              onSelect={() => void selectEvent(item.workshopDateId)}
            />
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}
