import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

export function InfoBanner({ children }: { children: React.ReactNode }) {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        backgroundColor: "rgba(40, 133, 210, 0.1)",
        borderRadius: 12,
        padding: 14,
        marginTop: 16,
      }}
    >
      <Ionicons name="information-circle-outline" size={22} color={colors.link} />
      <Text style={{ flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 19 }}>
        {children}
      </Text>
    </View>
  );
}

export function SyncBanner({ label, detail }: { label: string; detail: string }) {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "rgba(40, 133, 210, 0.08)",
        borderRadius: 12,
        padding: 14,
        marginTop: 16,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Ionicons name="time-outline" size={20} color={colors.link} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: colors.textSubtle }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 2 }}>
          {detail}
        </Text>
      </View>
    </View>
  );
}
