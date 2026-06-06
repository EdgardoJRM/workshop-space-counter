import { View } from "react-native";

/** Patrón de puntos decorativo (mockup login / evento). */
export function DotGrid({
  rows = 5,
  cols = 5,
  size = 4,
  gap = 6,
  color = "rgba(255,255,255,0.35)",
}: {
  rows?: number;
  cols?: number;
  size?: number;
  gap?: number;
  color?: string;
}) {
  return (
    <View style={{ flexDirection: "column", gap }}>
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={{ flexDirection: "row", gap }}>
          {Array.from({ length: cols }).map((__, c) => (
            <View
              key={c}
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
