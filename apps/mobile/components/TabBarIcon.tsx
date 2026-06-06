import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useAppTheme } from "@/lib/useAppTheme";

export type TabIconName = "evento" | "scan" | "list" | "printer" | "admin";

/** Color del tab activo según mockup: Evento/Escanear = gold; Lista/Impresora/Admin = blue. */
export const tabActiveTint: Record<TabIconName, "gold" | "blue"> = {
  evento: "gold",
  scan: "gold",
  list: "blue",
  printer: "blue",
  admin: "blue",
};

const iconMap: Record<TabIconName, keyof typeof Ionicons.glyphMap> = {
  evento: "calendar-outline",
  scan: "scan-outline",
  list: "list-outline",
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
    <View style={{ alignItems: "center", justifyContent: "center", minHeight: 28 }}>
      {focused ? (
        <View
          style={{
            position: "absolute",
            top: -8,
            width: 32,
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

export function tabBarActiveColor(
  name: TabIconName,
  colors: { accent: string; header: string }
): string {
  return tabActiveTint[name] === "gold" ? colors.accent : colors.header;
}
