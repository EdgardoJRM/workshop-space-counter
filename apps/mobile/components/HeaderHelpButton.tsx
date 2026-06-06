import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/useAppTheme";

export function HeaderHelpButton() {
  const { colors } = useAppTheme();
  return (
    <Pressable
      hitSlop={12}
      style={{
        marginRight: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.5)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="help" size={18} color={colors.onHeader} />
    </Pressable>
  );
}
