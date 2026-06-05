import { Stack } from "expo-router";
import { useAppTheme } from "@/lib/useAppTheme";

export default function AdminStackLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.onHeader,
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        headerBackTitle: "Admin",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Admin" }} />
      <Stack.Screen name="spaces" options={{ title: "Cupos" }} />
      <Stack.Screen name="dates" options={{ title: "Fechas" }} />
      <Stack.Screen name="registrations" options={{ title: "Registros" }} />
      <Stack.Screen name="labels" options={{ title: "Labels" }} />
      <Stack.Screen name="pairing" options={{ title: "Emparejar impresora" }} />
      <Stack.Screen name="webhook" options={{ title: "Webhook ClickFunnels" }} />
      <Stack.Screen name="emails" options={{ title: "Emails" }} />
      <Stack.Screen name="branding" options={{ title: "Marca / white-label" }} />
    </Stack>
  );
}
