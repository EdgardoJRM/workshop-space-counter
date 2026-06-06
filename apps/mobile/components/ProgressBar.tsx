import { View } from "react-native";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

export function ProgressBar({
  value,
  max,
  fillColor,
}: {
  value: number;
  max: number;
  fillColor?: string;
}) {
  const { colors } = useAppTheme();
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const fill = fillColor ?? colors.link;

  return (
    <View
      style={{
        height: 8,
        borderRadius: 4,
        backgroundColor: "rgba(63, 94, 120, 0.12)",
        overflow: "hidden",
        marginTop: 10,
      }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: "100%",
          backgroundColor: fill,
          borderRadius: 4,
        }}
      />
    </View>
  );
}

/** Barra verde para fechas activas (mockup Admin Fechas). */
export function ProgressBarSuccess({ value, max }: { value: number; max: number }) {
  return <ProgressBar value={value} max={max} fillColor={webBrand.success} />;
}
