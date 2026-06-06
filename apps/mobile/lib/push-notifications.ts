import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { API_BASE_URL } from "@/constants/config";
import { getAccessToken } from "./storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Hernandez Pass",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: typeof projectId === "string" ? projectId : undefined,
  });

  return tokenData.data;
}

export async function syncPushTokenWithServer(): Promise<void> {
  const token = await registerForPushNotifications();
  if (!token) return;

  const accessToken = await getAccessToken();
  if (!accessToken) return;

  const res = await fetch(`${API_BASE_URL}/api/mobile/push/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      expoPushToken: token,
      platform: Platform.OS,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn("[push] register failed", res.status, text);
  }
}

/** Notificación local inmediata (p. ej. tras check-in). */
export async function showLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: "default" },
    trigger: null,
  });
}
