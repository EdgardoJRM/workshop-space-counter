import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useAppTheme } from "@/lib/useAppTheme";

export function IconCircle({
  name,
  size = 44,
  variant = "gold",
}: {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  variant?: "gold" | "blue" | "green" | "slate";
}) {
  const { colors } = useAppTheme();
  const bg =
    variant === "gold"
      ? "rgba(255, 201, 7, 0.22)"
      : variant === "blue"
        ? "rgba(40, 133, 210, 0.15)"
        : variant === "green"
          ? "rgba(45, 106, 79, 0.15)"
          : "rgba(63, 94, 120, 0.12)";
  const iconColor =
    variant === "gold"
      ? colors.text
      : variant === "blue"
        ? colors.link
        : variant === "green"
          ? colors.success
          : colors.primary;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={size * 0.48} color={iconColor} />
    </View>
  );
}
