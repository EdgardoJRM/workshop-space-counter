import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { HeaderLogoButton } from "@/components/HeaderLogoButton";
import { TabBarIcon, type TabIconName } from "@/components/TabBarIcon";
import { useSession } from "@/lib/session-context";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

function tabIcon(name: TabIconName) {
  return ({
    color,
    focused,
  }: {
    color: string;
    focused: boolean;
  }) => <TabBarIcon name={name} color={color} focused={focused} />;
}

export default function MainLayout() {
  const { colors, brand } = useAppTheme();
  const { isAdmin, loaded } = useSession();

  const headerLogo = { headerLeft: () => <HeaderLogoButton /> };

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
          paddingTop: 8,
          height: Platform.OS === "ios" ? 88 : 64,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
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
          ...headerLogo,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: "Lista",
          tabBarLabel: "Lista",
          tabBarIcon: tabIcon("list"),
          ...headerLogo,
        }}
      />
      <Tabs.Screen
        name="printer"
        options={{
          title: "Impresora",
          tabBarLabel: "Impresora",
          tabBarIcon: tabIcon("printer"),
          ...headerLogo,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          tabBarLabel: "Admin",
          tabBarIcon: tabIcon("admin"),
          headerLeft: () => <HeaderLogoButton />,
          href: loaded && isAdmin ? undefined : null,
        }}
      />
    </Tabs>
  );
}
