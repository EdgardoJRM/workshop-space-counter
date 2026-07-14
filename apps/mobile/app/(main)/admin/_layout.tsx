import { Stack } from "expo-router";
import { Platform } from "react-native";
import { HeaderHelpButton } from "@/components/HeaderHelpButton";
import { HeaderLogoButton } from "@/components/HeaderLogoButton";
import { useAppTheme } from "@/lib/useAppTheme";

export default function AdminStackLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.onHeader,
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        headerShadowVisible: false,
        headerBackTitle: "Admin",
        headerRight: () => <HeaderHelpButton />,
        ...Platform.select({
          ios: { headerBackButtonDisplayMode: "minimal" as const },
          default: {},
        }),
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Admin",
          headerLeft: () => <HeaderLogoButton />,
        }}
      />
      <Stack.Screen name="spaces" options={{ title: "Cupos" }} />
      <Stack.Screen name="dates" options={{ title: "Fechas" }} />
      <Stack.Screen name="registrations" options={{ title: "Personas" }} />
      <Stack.Screen name="labels" options={{ title: "Labels" }} />
      <Stack.Screen name="pairing" options={{ title: "Emparejar impresora" }} />
      <Stack.Screen name="webhook" options={{ title: "Webhook ClickFunnels" }} />
      <Stack.Screen
        name="pending-purchases"
        options={{ title: "Compras sin asignar" }}
      />
      <Stack.Screen name="guest-info" options={{ title: "Invitados pendientes" }} />
      <Stack.Screen name="emails" options={{ title: "Emails / Automatizaciones" }} />
      <Stack.Screen name="branding" options={{ title: "Marca / white-label" }} />
    </Stack>
  );
}
