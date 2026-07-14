import { Pressable, ScrollView, Text, View } from "react-native";
import { WORKSHOP_SLUGS, getWorkshopLabel, type WorkshopSlug } from "@/lib/workshops";
import { useAppTheme } from "@/lib/useAppTheme";

type Props = {
  value: WorkshopSlug | "all";
  onChange: (slug: WorkshopSlug | "all") => void;
  showAll?: boolean;
};

/** Filtro visible por taller — sin modal ni taller global en sesión. */
export function WorkshopChips({ value, onChange, showAll = false }: Props) {
  const { colors, styles } = useAppTheme();

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.sectionLabel}>Taller</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
      >
        {showAll ? (
          <Pressable
            onPress={() => onChange("all")}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: value === "all" ? colors.primary : colors.border,
              backgroundColor: value === "all" ? `${colors.primary}12` : colors.surface,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: value === "all" ? "700" : "500",
                color: value === "all" ? colors.primary : colors.text,
              }}
            >
              Todos
            </Text>
          </Pressable>
        ) : null}
        {WORKSHOP_SLUGS.map((slug) => {
          const selected = value === slug;
          return (
            <Pressable
              key={slug}
              onPress={() => onChange(slug)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? `${colors.primary}12` : colors.surface,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: selected ? "700" : "500",
                  color: selected ? colors.primary : colors.text,
                }}
              >
                {getWorkshopLabel(slug)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
