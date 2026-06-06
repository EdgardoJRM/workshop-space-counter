import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { DotGrid } from "@/components/DotGrid";
import { useAppTheme } from "@/lib/useAppTheme";

/** Hero azul ondulado + hoja blanca (Login / Magic link). */
export function AuthHeroSheet({
  hero,
  children,
  heroStyle,
  heroMinHeight = 220,
}: {
  hero: ReactNode;
  children: ReactNode;
  heroStyle?: ViewStyle;
  heroMinHeight?: number;
}) {
  const { colors, styles } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.hero,
          {
            minHeight: heroMinHeight,
            alignItems: "center",
            paddingBottom: 48,
            overflow: "hidden",
          },
          heroStyle,
        ]}
      >
        <View style={{ position: "absolute", top: 16, right: 20 }}>
          <DotGrid color="rgba(255,255,255,0.3)" />
        </View>
        {hero}
      </View>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          marginTop: -32,
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 32,
        }}
      >
        {children}
      </View>
    </View>
  );
}
