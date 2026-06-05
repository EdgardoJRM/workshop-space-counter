import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { HeaderLogoButton } from "@/components/HeaderLogoButton";
import { HeaderLogoutButton } from "@/components/HeaderLogoutButton";
import { ScreenHeader } from "@/components/ScreenHeader";
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

function EventsHeader() {
  const { brand } = useAppTheme();
  const subtitle =
    brand.displayName && brand.displayName !== brand.appTitle
      ? brand.displayName
      : "Panel de eventos";

  return (
    <ScreenHeader
      title={brand.appTitle}
      subtitle={subtitle}
      right={<HeaderLogoutButton />}
    />
  );
}

function ToolHeader({ title }: { title: string }) {
  return (
    <ScreenHeader
      title={title}
      left={<HeaderLogoButton />}
    />
  );
}

export default function MainLayout() {
  const { colors } = useAppTheme();
  const { isAdmin, loaded } = useSession();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarStyle: {
          backgroundColor: webBrand.white,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 6,
          height: Platform.OS === "ios" ? 84 : 62,
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
        options={{
          title: "Evento",
          header: () => <EventsHeader />,
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
          header: () => <ToolHeader title="Escanear" />,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: "Lista",
          tabBarLabel: "Lista",
          tabBarIcon: tabIcon("list"),
          header: () => <ToolHeader title="Lista" />,
        }}
      />
      <Tabs.Screen
        name="printer"
        options={{
          title: "Impresora",
          tabBarLabel: "Impresora",
          tabBarIcon: tabIcon("printer"),
          header: () => <ToolHeader title="Impresora" />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          tabBarLabel: "Admin",
          tabBarIcon: tabIcon("admin"),
          header: () => <ToolHeader title="Admin" />,
          href: loaded && isAdmin ? undefined : null,
        }}
      />
    </Tabs>
  );
}
