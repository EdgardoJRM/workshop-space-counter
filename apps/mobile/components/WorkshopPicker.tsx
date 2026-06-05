import { Pressable, ScrollView, Text, View } from "react-native";
import { useSession } from "@/lib/session-context";
import { WORKSHOP_SLUGS, getWorkshopLabel, type WorkshopSlug } from "@/lib/workshops";
import { useAppTheme } from "@/lib/useAppTheme";

export function WorkshopPicker() {
  const { workshop, setWorkshop } = useSession();
  const { colors, styles } = useAppTheme();

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.sectionLabel}>Taller</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {WORKSHOP_SLUGS.map((slug) => {
            const active = workshop === slug;
            return (
              <Pressable
                key={slug}
                onPress={() => setWorkshop(slug as WorkshopSlug)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: active ? colors.onHeader : colors.textMuted,
                  }}
                >
                  {getWorkshopLabel(slug)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
