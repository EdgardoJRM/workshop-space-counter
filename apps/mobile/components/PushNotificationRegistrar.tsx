import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { usePushNotificationNavigation } from "@/lib/push-navigation";
import { syncPushTokenWithServer } from "@/lib/push-notifications";
import { useSession } from "@/lib/session-context";

function trySync() {
  void syncPushTokenWithServer().catch(() => {
    /* permiso denegado o simulador */
  });
}

/** Registra el dispositivo para push tras login (staff/admin). */
export function PushNotificationRegistrar() {
  const { loaded, isStaff } = useSession();
  usePushNotificationNavigation(loaded && isStaff);

  useEffect(() => {
    if (!loaded || !isStaff) return;
    trySync();
  }, [loaded, isStaff]);

  useEffect(() => {
    if (!loaded || !isStaff) return;

    const onChange = (state: AppStateStatus) => {
      if (state === "active") trySync();
    };

    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [loaded, isStaff]);

  return null;
}
