import { ScrollView, Text } from "react-native";
import { type Href, router } from "expo-router";
import { AdminHubCard } from "@/components/AdminHubCard";
import { useAppTheme } from "@/lib/useAppTheme";

const HUB_ITEMS = [
  {
    kicker: "TALLER",
    kickerVariant: "gold" as const,
    title: "Cupos / Contador ClickFunnels",
    description: "Gestiona el cupo total y el contador en vivo.",
    icon: "ticket-outline" as const,
    route: "spaces",
  },
  {
    kicker: "TALLER",
    kickerVariant: "gold" as const,
    title: "Fechas",
    description: "Crear, editar y activar fechas del evento.",
    icon: "calendar-outline" as const,
    route: "dates",
  },
  {
    kicker: "TALLER",
    kickerVariant: "gold" as const,
    title: "Registros",
    description: "Ver lista, check-in manual, CSV y reenvío.",
    icon: "people-outline" as const,
    route: "registrations",
  },
  {
    kicker: "TALLER",
    kickerVariant: "gold" as const,
    title: "Labels",
    description: "Plantilla y diseño para rollo 3×2.",
    icon: "pricetag-outline" as const,
    route: "labels",
  },
  {
    kicker: "SISTEMA",
    kickerVariant: "blue" as const,
    title: "Emparejar impresora",
    description: "Conecta la impresora con tu código Mac.",
    icon: "print-outline" as const,
    route: "pairing",
  },
  {
    kicker: "SISTEMA",
    kickerVariant: "blue" as const,
    title: "Webhook ClickFunnels",
    description: "Configura la URL y el secreto de integración.",
    icon: "link-outline" as const,
    route: "webhook",
  },
  {
    kicker: "SISTEMA",
    kickerVariant: "blue" as const,
    title: "Emails / Automatizaciones",
    description: "Plantillas post-evento, delays y historial de envíos.",
    icon: "mail-outline" as const,
    route: "emails",
  },
  {
    kicker: "SISTEMA",
    kickerVariant: "blue" as const,
    title: "Marca / white-label",
    description: "Personaliza nombre, colores y logo.",
    icon: "color-palette-outline" as const,
    route: "branding",
  },
] as const;

function openAdminScreen(route: string) {
  router.push(`/admin/${route}` as Href);
}

export default function AdminHubScreen() {
  const { styles } = useAppTheme();

  return (
    <ScrollView style={styles.screenPadded} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={[styles.subtitle, { marginBottom: 20 }]}>
        Centro de configuración — mismo poder que el admin web.
      </Text>

      {HUB_ITEMS.map((item) => (
        <AdminHubCard
          key={item.route}
          kicker={item.kicker}
          kickerVariant={item.kickerVariant}
          title={item.title}
          description={item.description}
          icon={item.icon}
          onPress={() => openAdminScreen(item.route)}
        />
      ))}
    </ScrollView>
  );
}
