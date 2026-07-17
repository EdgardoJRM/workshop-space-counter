import { Linking } from "react-native";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { API_BASE_URL } from "@/constants/config";

const ADMIN_PENDING_URL = `${API_BASE_URL}/login?intent=admin&next=/admin`;

function routeFromPushData(
  data: Record<string, unknown> | undefined
): string | null {
  if (!data || data.type !== "workshop_pick") return null;
  return ADMIN_PENDING_URL;
}

/** Abre admin web al tocar notificación de compra sin taller. */
export function usePushNotificationNavigation(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const navigate = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      const url = routeFromPushData(data);
      if (url) void Linking.openURL(url);
    };

    void Notifications.getLastNotificationResponseAsync().then(navigate);

    const sub = Notifications.addNotificationResponseReceivedListener(navigate);
    return () => sub.remove();
  }, [enabled]);
}
