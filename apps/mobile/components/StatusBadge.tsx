import { Text, View } from "react-native";
import { useAppTheme } from "@/lib/useAppTheme";

export type BadgeVariant = "success" | "gold" | "muted" | "danger" | "warning";

const variantStyles: Record<
  BadgeVariant,
  { bg: string; text: string }
> = {
  success: { bg: "rgba(45, 106, 79, 0.14)", text: "#2d6a4f" },
  gold: { bg: "rgba(255, 201, 7, 0.28)", text: "#222022" },
  muted: { bg: "rgba(165, 165, 165, 0.2)", text: "#4c5c68" },
  danger: { bg: "rgba(220, 38, 38, 0.1)", text: "#dc2626" },
  warning: { bg: "rgba(255, 201, 7, 0.2)", text: "#b45309" },
};

export function StatusBadge({
  label,
  variant = "muted",
}: {
  label: string;
  variant?: BadgeVariant;
}) {
  const v = variantStyles[variant];

  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: v.bg,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color: v.text }}>{label}</Text>
    </View>
  );
}
