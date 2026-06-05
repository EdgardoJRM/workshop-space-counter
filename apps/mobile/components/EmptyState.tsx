import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

export function EmptyState({
  title,
  message,
  icon = "calendar-outline",
  hintArrowToEvento,
}: {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  hintArrowToEvento?: boolean;
}) {
  const { colors, styles } = useAppTheme();

  return (
    <View style={[styles.card, { alignItems: "center", paddingVertical: 32 }]}>
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: "rgba(255, 201, 7, 0.2)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Ionicons name={icon} size={40} color={colors.primary} />
        <View
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            backgroundColor: colors.accent,
            borderRadius: 8,
            padding: 4,
          }}
        >
          <Ionicons name="ticket-outline" size={14} color={colors.onAccent} />
        </View>
      </View>
      <Text style={[styles.title, { fontSize: 18, textAlign: "center" }]}>{title}</Text>
      <Text
        style={[
          styles.subtitle,
          { textAlign: "center", marginTop: 8, maxWidth: 280 },
        ]}
      >
        {message}
      </Text>
      {hintArrowToEvento ? (
        <Text style={{ marginTop: 20, fontSize: 28, color: colors.accent }}>↙</Text>
      ) : null}
    </View>
  );
}
