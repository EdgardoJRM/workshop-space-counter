import { Text, View, type ViewStyle } from "react-native";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

export function AppLogo({
  size = 36,
  style,
}: {
  size?: number;
  style?: ViewStyle;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.header,
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.35)",
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text
        style={{
          color: webBrand.white,
          fontSize: size * 0.38,
          fontWeight: "700",
          letterSpacing: -0.5,
        }}
      >
        HP
      </Text>
    </View>
  );
}
