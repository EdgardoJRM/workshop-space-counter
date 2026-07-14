import { Image, View, type ImageStyle, type ViewStyle } from "react-native";
import { useAppTheme } from "@/lib/useAppTheme";

/** Hernandez Pass mark — mismo arte que `assets/icon.png` (App Store). */
const logoSource = require("@/assets/icon.png");

export function AppLogo({
  size = 36,
  style,
  rounded = "ios",
}: {
  size?: number;
  style?: ViewStyle;
  /** ios = esquinas ~22% como icono de app; circle = avatar redondo en header */
  rounded?: "ios" | "circle";
}) {
  const { colors } = useAppTheme();
  const radius =
    rounded === "circle" ? size / 2 : Math.round(size * 0.223);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          overflow: "hidden",
          backgroundColor: colors.header,
        },
        style,
      ]}
    >
      <Image
        alt="Hernandez Pass"
        source={logoSource}
        style={
          {
            width: size,
            height: size,
          } as ImageStyle
        }
        resizeMode="cover"
        accessibilityLabel="Hernandez Pass"
      />
    </View>
  );
}
