import { View } from "react-native";
import { useAppTheme } from "@/lib/useAppTheme";

export function ProgressBar({
  value,
  max,
}: {
  value: number;
  max: number;
}) {
  const { colors } = useAppTheme();
  const pct = max > 0 ? Math.min(1, value / max) : 0;

  return (
    <View
      style={{
        height: 8,
        borderRadius: 4,
        backgroundColor: "rgba(63, 94, 120, 0.15)",
        overflow: "hidden",
        marginTop: 10,
      }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: "100%",
          backgroundColor: colors.link,
          borderRadius: 4,
        }}
      />
    </View>
  );
}
