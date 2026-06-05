import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { clearSession } from "@/lib/storage";
import { useAppTheme } from "@/lib/useAppTheme";

export function HeaderLogoutButton() {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={() => {
        void clearSession().then(() => router.replace("/"));
      }}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 8,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Ionicons name="log-out-outline" size={20} color={colors.textMuted} />
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted }}>
        Salir
      </Text>
    </Pressable>
  );
}
