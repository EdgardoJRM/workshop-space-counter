import { Tabs } from "expo-router";
import { Platform, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HeaderHelpButton } from "@/components/HeaderHelpButton";
import { HeaderLogoButton } from "@/components/HeaderLogoButton";
import { TabBarIcon, tabBarActiveColor, type TabIconName } from "@/components/TabBarIcon";
import { PushNotificationRegistrar } from "@/components/PushNotificationRegistrar";
import { EventProvider } from "@/lib/event-context";
import { SessionGuard } from "@/components/SessionGuard";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

function tabIcon(name: TabIconName) {
  function TabIcon({ color, focused }: { color: string; focused: boolean }) {
    return <TabBarIcon name={name} color={color} focused={focused} />;
  }
  TabIcon.displayName = `TabIcon(${name})`;
  return TabIcon;
}

function MainTabs() {
  const { colors, brand } = useAppTheme();

  const headerHelp = {
    headerRight: () => <HeaderHelpButton />,
  };

  return (
    <Tabs
      screenOptions={({ route }) => {
        const tabName = route.name as TabIconName;
        const isScan = route.name === "scan";
        const activeColor = tabBarActiveColor(tabName, colors);

        return {
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
          headerShown: true,
          tabBarStyle: {
            backgroundColor: isScan ? "#000000" : webBrand.white,
            borderTopColor: isScan ? "#222" : colors.border,
            borderTopWidth: 1,
            paddingTop: 8,
            height: Platform.OS === "ios" ? 88 : 64,
          },
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: isScan ? "rgba(255,255,255,0.55)" : colors.textSubtle,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
          },
        };
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: brand.appTitle,
          tabBarLabel: "Evento",
          tabBarIcon: tabIcon("evento"),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Escanear",
          tabBarLabel: "Escanear",
          tabBarIcon: tabIcon("scan"),
          headerLeft: () => (
            <Pressable style={{ marginLeft: 12 }} hitSlop={8}>
              <Ionicons name="flash-outline" size={22} color={colors.onHeader} />
            </Pressable>
          ),
          ...headerHelp,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: "Lista",
          tabBarLabel: "Lista",
          tabBarIcon: tabIcon("list"),
          headerLeft: () => <HeaderLogoButton />,
          headerRight: () => (
            <Pressable
              style={{
                marginRight: 12,
                width: 34,
                height: 34,
                borderRadius: 17,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.5)",
                alignItems: "center",
                justifyContent: "center",
              }}
              hitSlop={8}
            >
              <Ionicons name="funnel-outline" size={18} color={colors.onHeader} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="printer"
        options={{
          title: "Impresora",
          tabBarLabel: "Impresora",
          tabBarIcon: tabIcon("printer"),
          headerLeft: () => <HeaderLogoButton />,
          ...headerHelp,
        }}
      />
    </Tabs>
  );
}

export default function MainLayout() {
  return (
    <SessionGuard>
      <EventProvider>
        <PushNotificationRegistrar />
        <MainTabs />
      </EventProvider>
    </SessionGuard>
  );
}
