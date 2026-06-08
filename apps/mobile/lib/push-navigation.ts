import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { type Href, useRouter } from "expo-router";

function routeFromPushData(
  data: Record<string, unknown> | undefined
): Href | null {
  if (!data || data.type !== "workshop_pick") return null;
  return "/admin/pending-purchases" as Href;
}

/** Abre la pantalla de compras pendientes al tocar la notificación push. */
export function usePushNotificationNavigation(enabled: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const navigate = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      const href = routeFromPushData(data);
      if (href) router.push(href);
    };

    void Notifications.getLastNotificationResponseAsync().then(navigate);

    const sub = Notifications.addNotificationResponseReceivedListener(navigate);
    return () => sub.remove();
  }, [enabled, router]);
}
