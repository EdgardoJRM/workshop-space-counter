import { useCallback, useState } from "react";
import { ScrollView, Text } from "react-native";
import { type Href, router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { AdminHubCard } from "@/components/AdminHubCard";
import { fetchPendingGuestInfo, fetchPendingPurchases } from "@/lib/admin-api";
import { useAppTheme } from "@/lib/useAppTheme";

const MAIN_ITEMS = [
  {
    kicker: "OPERACIÓN",
    kickerVariant: "gold" as const,
    title: "Cupos",
    description: "Contador en vivo para ClickFunnels.",
    icon: "ticket-outline" as const,
    route: "spaces",
  },
  {
    kicker: "OPERACIÓN",
    kickerVariant: "gold" as const,
    title: "Fechas",
    description: "En venta (compras) y evento de hoy (check-in).",
    icon: "calendar-outline" as const,
    route: "dates",
  },
  {
    kicker: "OPERACIÓN",
    kickerVariant: "gold" as const,
    title: "Personas",
    description: "Lista, CSV, reenvío de pase y reimpresión.",
    icon: "people-outline" as const,
    route: "registrations",
  },
  {
    kicker: "OPERACIÓN",
    kickerVariant: "blue" as const,
    title: "Impresora",
    description: "Estado de la Rollo y código Mac.",
    icon: "print-outline" as const,
    route: "pairing",
  },
  {
    kicker: "ATENCIÓN",
    kickerVariant: "gold" as const,
    title: "Compras sin asignar",
    description: "ClickFunnels sin taller en la URL.",
    icon: "help-circle-outline" as const,
    route: "pending-purchases",
    alertKey: "pending" as const,
  },
  {
    kicker: "ATENCIÓN",
    kickerVariant: "gold" as const,
    title: "Invitados pendientes",
    description: "Boletos extra sin datos del invitado.",
    icon: "person-add-outline" as const,
    route: "guest-info",
    alertKey: "guests" as const,
  },
] as const;

const ADVANCED_ITEMS = [
  {
    kicker: "AVANZADO",
    kickerVariant: "blue" as const,
    title: "Webhook ClickFunnels",
    description: "Una URL por taller.",
    icon: "link-outline" as const,
    route: "webhook",
  },
  {
    kicker: "AVANZADO",
    kickerVariant: "blue" as const,
    title: "Labels",
    description: "Diseño del rollo 3×2.",
    icon: "pricetag-outline" as const,
    route: "labels",
  },
  {
    kicker: "AVANZADO",
    kickerVariant: "blue" as const,
    title: "Emails",
    description: "Plantillas post-evento.",
    icon: "mail-outline" as const,
    route: "emails",
  },
  {
    kicker: "AVANZADO",
    kickerVariant: "blue" as const,
    title: "Marca",
    description: "Nombre, colores y logo.",
    icon: "color-palette-outline" as const,
    route: "branding",
  },
] as const;

function openAdminScreen(route: string) {
  router.push(`/admin/${route}` as Href);
}

export default function AdminHubScreen() {
  const { styles } = useAppTheme();
  const [pendingCount, setPendingCount] = useState(0);
  const [guestCount, setGuestCount] = useState(0);

  const loadCounts = useCallback(async () => {
    try {
      const [pending, guests] = await Promise.all([
        fetchPendingPurchases(),
        fetchPendingGuestInfo(),
      ]);
      setPendingCount(pending.count);
      setGuestCount(guests.count);
    } catch {
      setPendingCount(0);
      setGuestCount(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCounts();
    }, [loadCounts])
  );

  return (
    <ScrollView style={styles.screenPadded} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={[styles.subtitle, { marginBottom: 20, fontSize: 16, lineHeight: 22 }]}>
        Configuración del evento — elige una tarea. No hace falta elegir un taller global:
        cada fecha ya incluye su taller.
      </Text>

      {MAIN_ITEMS.map((item) => {
        const count =
          "alertKey" in item && item.alertKey === "pending"
            ? pendingCount
            : "alertKey" in item && item.alertKey === "guests"
              ? guestCount
              : 0;
        return (
          <AdminHubCard
            key={item.route}
            kicker={item.kicker}
            kickerVariant={item.kickerVariant}
            title={count > 0 ? `${item.title} (${count})` : item.title}
            description={item.description}
            icon={item.icon}
            onPress={() => openAdminScreen(item.route)}
          />
        );
      })}

      <Text style={[styles.sectionLabel, { marginTop: 8, marginBottom: 12 }]}>Avanzado</Text>
      {ADVANCED_ITEMS.map((item) => (
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
