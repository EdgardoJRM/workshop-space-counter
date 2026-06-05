import { Ionicons } from "@expo/vector-icons";

export type TabIconName = "evento" | "scan" | "list" | "printer" | "admin";

const outlineMap: Record<TabIconName, keyof typeof Ionicons.glyphMap> = {
  evento: "calendar-outline",
  scan: "scan-outline",
  list: "people-outline",
  printer: "print-outline",
  admin: "options-outline",
};

const filledMap: Record<TabIconName, keyof typeof Ionicons.glyphMap> = {
  evento: "calendar",
  scan: "scan",
  list: "people",
  printer: "print",
  admin: "options",
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
  return (
    <Ionicons
      name={focused ? filledMap[name] : outlineMap[name]}
      size={24}
      color={color}
    />
  );
}
