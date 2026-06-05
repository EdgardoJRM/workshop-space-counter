import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";
import { IconCircle } from "./IconCircle";

export function AdminHubCard({
  kicker,
  kickerVariant = "gold",
  title,
  description,
  icon,
  onPress,
}: {
  kicker: string;
  kickerVariant?: "gold" | "blue";
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { colors, styles } = useAppTheme();
  const kickerColor = kickerVariant === "blue" ? colors.link : colors.accent;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.rowCard,
        {
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        },
      ]}
    >
      <IconCircle
        name={icon}
        variant={kickerVariant === "blue" ? "blue" : "gold"}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.sectionLabel,
            { marginBottom: 2, color: kickerColor },
          ]}
        >
          {kicker}
        </Text>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={[styles.rowMeta, { marginTop: 4 }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />
    </Pressable>
  );
}
