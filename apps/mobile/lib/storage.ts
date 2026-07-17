import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { OrganizationBranding } from "./types";

const TOKEN_KEY = "hp_access_token";
const ORG_KEY = "hp_org_slug";

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
}

async function removeSecureItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    await AsyncStorage.removeItem(key);
  }
}

export async function saveSession(
  accessToken: string,
  orgSlug: string
): Promise<void> {
  await Promise.all([
    setSecureItem(TOKEN_KEY, accessToken),
    setSecureItem(ORG_KEY, orgSlug),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  const secure = await getSecureItem(TOKEN_KEY);
  if (secure) return secure;
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getOrgSlug(): Promise<string | null> {
  const secure = await getSecureItem(ORG_KEY);
  if (secure) return secure;
  return AsyncStorage.getItem(ORG_KEY);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    removeSecureItem(TOKEN_KEY),
    removeSecureItem(ORG_KEY),
    AsyncStorage.multiRemove([TOKEN_KEY, ORG_KEY]),
  ]);
}

export async function saveOrgSlug(slug: string): Promise<void> {
  await setSecureItem(ORG_KEY, slug);
}

export type { OrganizationBranding };
