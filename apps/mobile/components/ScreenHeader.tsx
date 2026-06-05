import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/lib/useAppTheme";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  variant?: "light" | "brand";
};

export function ScreenHeader({
  title,
  subtitle,
  left,
  right,
  variant = "light",
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const isBrand = variant === "brand";

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top,
          backgroundColor: isBrand ? colors.header : colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        {left ? <View style={styles.side}>{left}</View> : null}
        <View style={styles.titles}>
          <Text
            style={[
              styles.title,
              { color: isBrand ? colors.onHeader : colors.text },
            ]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                {
                  color: isBrand ? "rgba(255,255,255,0.78)" : colors.textMuted,
                },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={[styles.side, styles.right]}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    gap: 8,
  },
  side: {
    flexShrink: 0,
  },
  right: {
    marginLeft: "auto",
  },
  titles: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
});
