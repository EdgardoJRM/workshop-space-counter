import { Tabs } from "expo-router";
import { useBrand } from "@/lib/theme";

export default function MainLayout() {
  const { brand } = useBrand();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: brand.primaryColor },
        headerTintColor: "#fff",
        tabBarActiveTintColor: brand.accentColor,
        tabBarInactiveTintColor: "#888",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Evento", tabBarLabel: "Evento" }} />
      <Tabs.Screen name="scan" options={{ title: "Escanear", tabBarLabel: "Escanear" }} />
      <Tabs.Screen name="list" options={{ title: "Lista", tabBarLabel: "Lista" }} />
      <Tabs.Screen name="printer" options={{ title: "Impresora", tabBarLabel: "Impresora" }} />
    </Tabs>
  );
}
