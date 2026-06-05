import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useAppTheme } from "@/lib/useAppTheme";

export type TabIconName = "evento" | "scan" | "list" | "printer" | "admin";

const iconMap: Record<TabIconName, keyof typeof Ionicons.glyphMap> = {
  evento: "calendar-outline",
  scan: "scan-outline",
  list: "people-outline",
  printer: "print-outline",
  admin: "options-outline",
};

export function TabBarIcon({
  name,
  focused,
  color,
}: {
  name: TabIconName;
  focused: boolean;
  color: string;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {focused ? (
        <View
          style={{
            position: "absolute",
            top: -10,
            width: 28,
            height: 3,
            borderRadius: 2,
            backgroundColor: colors.accent,
          }}
        />
      ) : null}
      <Ionicons name={iconMap[name]} size={22} color={color} />
    </View>
  );
}
