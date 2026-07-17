import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MobileEvent } from "@/lib/types";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

function formatEventDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-PR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type Props = {
  events: MobileEvent[];
  selectedEventId: string | null;
  onSelect: (workshopDateId: string) => void;
};

/** Selector compacto de fecha de evento (fila + bottom sheet). */
export function EventDatePicker({ events, selectedEventId, onSelect }: Props) {
  const { colors, styles } = useAppTheme();
  const [open, setOpen] = useState(false);

  const selected = events.find((e) => e.workshopDateId === selectedEventId);

  if (events.length === 0) return null;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.sectionLabel}>Fecha del evento</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: webBrand.white,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{ flex: 1, fontSize: 15, color: colors.text, fontWeight: "500" }}
          numberOfLines={2}
        >
          {selected?.label ?? "Seleccionar fecha"}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textSubtle} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: webBrand.white,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 16,
              maxHeight: "60%",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.title, { fontSize: 17, marginBottom: 12 }]}>
              Cambiar fecha
            </Text>
            <ScrollView>
              {events.map((item) => {
                const isSelected = item.workshopDateId === selectedEventId;
                return (
                  <Pressable
                    key={item.workshopDateId}
                    onPress={() => {
                      onSelect(item.workshopDateId);
                      setOpen(false);
                    }}
                    style={{
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: isSelected ? "700" : "500",
                        color: isSelected ? colors.primary : colors.text,
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                      {formatEventDateShort(item.startsAt)}
                      {" · "}
                      {item.checkedInCount}/{item.registrationCount} check-in
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
