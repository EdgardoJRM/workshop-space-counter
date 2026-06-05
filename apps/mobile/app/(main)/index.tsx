import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { IconCircle } from "@/components/IconCircle";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
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
            {item.isToday ? <StatusBadge label="Hoy" variant="gold" /> : null}
            {item.isActive ? <StatusBadge label="Activo" variant="success" /> : null}
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
      <ProgressBar value={item.checkedInCount} max={item.registrationCount} />

      <View style={{ marginTop: 14, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={styles.rowMeta}>{formatEventDate(item.startsAt)}</Text>
        </View>
      </View>

      <Text style={[styles.link, { marginTop: 12, alignSelf: "flex-end" }]}>
        Ver detalles ›
      </Text>
    </Pressable>
  );
}

function OtherEventRow({
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
      onPress={onSelect}
      style={[
        styles.rowCard,
        {
          borderWidth: 1,
          borderColor: active ? colors.accent : colors.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        },
      ]}
    >
      <IconCircle name="calendar-outline" variant="blue" size={40} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.label}</Text>
        <Text style={styles.rowMeta}>{formatEventDate(item.startsAt)}</Text>
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

  const active =
    events.find((e) => e.workshopDateId === selectedId) ?? events[0] ?? null;
  const others = events.filter((e) => e.workshopDateId !== active?.workshopDateId);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screenPadded} showsVerticalScrollIndicator={false}>
      <Pressable
        onPress={() => void logout()}
        style={[
          styles.btnOutline,
          {
            alignSelf: "flex-start",
            flexDirection: "row",
            gap: 6,
            marginBottom: 16,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.text} />
        <Text style={styles.btnOutlineText}>Cerrar sesión</Text>
      </Pressable>

      {active ? (
        <FeaturedEventCard
          item={active}
          onSelect={() => {
            setSelectedId(active.workshopDateId);
            void setSelectedEventId(active.workshopDateId);
          }}
        />
      ) : (
        <View style={styles.cardFlat}>
          <Text style={[styles.subtitle, { textAlign: "center" }]}>
            No hay eventos activos.
          </Text>
        </View>
      )}

      {others.length > 0 ? (
        <>
          <Text style={[styles.title, { fontSize: 18, marginTop: 24, marginBottom: 12 }]}>
            Otras fechas
          </Text>
          {others.map((item) => (
            <OtherEventRow
              key={item.workshopDateId}
              item={item}
              active={item.workshopDateId === selectedId}
              onSelect={() => {
                setSelectedId(item.workshopDateId);
                void setSelectedEventId(item.workshopDateId);
              }}
            />
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}
