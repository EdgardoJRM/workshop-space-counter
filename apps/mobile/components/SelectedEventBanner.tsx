import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelectedEvent } from "@/lib/event-context";
import { useAppTheme } from "@/lib/useAppTheme";

/** Muestra el evento activo debajo del header en Escanear / Lista. */
export function SelectedEventBanner() {
  const { selectedEvent, selectedEventId } = useSelectedEvent();
  const { colors } = useAppTheme();

  if (!selectedEventId || !selectedEvent) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "rgba(63, 94, 120, 0.1)",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Ionicons name="calendar-outline" size={16} color={colors.header} />
      <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: colors.text }}>
        {selectedEvent.label}
      </Text>
      <Text style={{ fontSize: 11, color: colors.textMuted }}>Esta fecha</Text>
    </View>
  );
}
