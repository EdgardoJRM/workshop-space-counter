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
import { IconCircle } from "@/components/IconCircle";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchEvents } from "@/lib/api";
import { getEventDisplay } from "@/lib/event-display";
import type { MobileEvent } from "@/lib/types";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

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
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
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
  const { colors } = useAppTheme();
  const display = getEventDisplay(item, formatEventDate);
  const pct =
    item.registrationCount > 0
      ? Math.round((item.checkedInCount / item.registrationCount) * 100)
      : 0;

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 4,
        borderLeftColor: colors.accent,
        padding: 20,
        opacity: pressed ? 0.96 : 1,
        shadowColor: webBrand.ink,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      })}
    >
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {item.isToday ? <StatusBadge label="Hoy" variant="gold" /> : null}
        {item.isActive ? <StatusBadge label="Activo" variant="success" /> : null}
      </View>

      <Text
        style={{
          fontSize: 22,
          fontWeight: "800",
          color: colors.text,
          letterSpacing: -0.4,
          lineHeight: 28,
        }}
      >
        {display.workshop}
      </Text>

      {display.session ? (
        <Text
          style={{
            fontSize: 15,
            fontWeight: "500",
            color: colors.textMuted,
            marginTop: 4,
            lineHeight: 20,
          }}
        >
          {display.session}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginTop: 14,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            color: colors.textMuted,
            lineHeight: 20,
          }}
        >
          {display.dateLine}
        </Text>
      </View>

      <View style={{ marginTop: 18 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSubtle }}>
            Check-in
          </Text>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
            {item.checkedInCount}
            <Text style={{ fontWeight: "500", color: colors.textMuted }}>
              {" "}
              de {item.registrationCount}
            </Text>
            <Text style={{ fontWeight: "600", color: colors.textSubtle }}> · {pct}%</Text>
          </Text>
        </View>
        <ProgressBar value={item.checkedInCount} max={item.registrationCount} />
      </View>
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
  const { colors } = useAppTheme();
  const display = getEventDisplay(item, formatEventDate);

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.border,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <IconCircle name="calendar-outline" variant="blue" size={44} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ fontSize: 16, fontWeight: "700", color: colors.text }}
          numberOfLines={1}
        >
          {display.workshop}
        </Text>
        {display.session ? (
          <Text
            style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}
            numberOfLines={1}
          >
            {display.session}
          </Text>
        ) : null}
        <Text style={{ fontSize: 12, color: colors.textSubtle, marginTop: 4 }} numberOfLines={1}>
          {display.dateLine}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>
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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
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
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 1.1,
              textTransform: "uppercase",
              color: colors.textSubtle,
              marginTop: 28,
              marginBottom: 12,
            }}
          >
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
