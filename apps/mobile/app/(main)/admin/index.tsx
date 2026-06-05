import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { AdminHubCard } from "@/components/AdminHubCard";
import { useAppTheme } from "@/lib/useAppTheme";

export default function AdminHubScreen() {
  const { styles } = useAppTheme();

  return (
    <ScrollView style={styles.screenPadded} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={[styles.subtitle, { marginBottom: 20 }]}>
        Centro de configuración — mismo poder que el admin web.
      </Text>

      <AdminHubCard
        kicker="Taller"
        title="Cupos"
        description="Contador de espacios en ClickFunnels"
        onPress={() => router.push("/(main)/admin/spaces")}
      />
      <AdminHubCard
        kicker="Taller"
        title="Fechas"
        description="Crear, editar y activar fechas del evento"
        onPress={() => router.push("/(main)/admin/dates")}
      />
      <AdminHubCard
        kicker="Taller"
        title="Registros"
        description="Lista, registro manual, CSV y reenvío de pase"
        onPress={() => router.push("/(main)/admin/registrations")}
      />
      <AdminHubCard
        kicker="Taller"
        title="Labels"
        description="Plantilla Rollo e impresión en check-in"
        onPress={() => router.push("/(main)/admin/labels")}
      />
      <AdminHubCard
        kicker="Sistema"
        title="Emparejar impresora"
        description="Código para la Mac del evento"
        onPress={() => router.push("/(main)/admin/pairing")}
      />
      <AdminHubCard
        kicker="Sistema"
        title="Webhook ClickFunnels"
        description="URL y estado del secreto"
        onPress={() => router.push("/(main)/admin/webhook")}
      />
      <AdminHubCard
        kicker="Sistema"
        title="Emails"
        description="Secuencia post-evento"
        onPress={() => router.push("/(main)/admin/emails")}
      />
      <AdminHubCard
        kicker="Sistema"
        title="Marca / white-label"
        description="Nombre, colores y título de la app"
        onPress={() => router.push("/(main)/admin/branding")}
      />
    </ScrollView>
  );
}
