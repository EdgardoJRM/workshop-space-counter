import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSession } from "@/lib/session-context";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

export default function MainLayout() {
  const { colors, brand } = useAppTheme();
  const { isAdmin, loaded } = useSession();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.header,
          ...Platform.select({
            ios: { shadowColor: "transparent" },
            default: { elevation: 0 },
          }),
        },
        headerTintColor: colors.onHeader,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 17,
        },
        tabBarStyle: {
          backgroundColor: webBrand.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
          height: Platform.OS === "ios" ? 88 : 64,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: brand.appTitle, tabBarLabel: "Evento" }}
      />
      <Tabs.Screen name="scan" options={{ title: "Escanear", tabBarLabel: "Escanear" }} />
      <Tabs.Screen name="list" options={{ title: "Lista", tabBarLabel: "Lista" }} />
      <Tabs.Screen
        name="printer"
        options={{ title: "Impresora", tabBarLabel: "Impresora" }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          tabBarLabel: "Admin",
          href: loaded && isAdmin ? undefined : null,
        }}
      />
    </Tabs>
  );
}
