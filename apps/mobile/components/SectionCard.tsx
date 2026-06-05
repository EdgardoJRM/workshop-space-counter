import { Ionicons } from "@expo/vector-icons";
import { Text, View, type ReactNode } from "react-native";
import { IconCircle } from "./IconCircle";
import { useAppTheme } from "@/lib/useAppTheme";

export function SectionCard({
  icon,
  title,
  children,
  iconVariant = "gold",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: ReactNode;
  iconVariant?: "gold" | "blue" | "green" | "slate";
}) {
  const { styles } = useAppTheme();

  return (
    <View style={[styles.card, { marginBottom: 16 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <IconCircle name={icon} variant={iconVariant} size={40} />
        <Text style={[styles.title, { fontSize: 18 }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
