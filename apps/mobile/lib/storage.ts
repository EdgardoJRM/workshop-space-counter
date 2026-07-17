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

  // AsyncStorage backup survives SecureStore edge cases on cold start.
  await AsyncStorage.setItem(key, value);
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  } catch {
    // Token remains in AsyncStorage.
  }
}

async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }

  try {
    const secure = await SecureStore.getItemAsync(key);
    if (secure) return secure;
  } catch {
    // fall through to AsyncStorage
  }

  return AsyncStorage.getItem(key);
}

async function removeSecureItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
    return;
  }

  await AsyncStorage.removeItem(key);
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
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
  return getSecureItem(TOKEN_KEY);
}

export async function getOrgSlug(): Promise<string | null> {
  return getSecureItem(ORG_KEY);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    removeSecureItem(TOKEN_KEY),
    removeSecureItem(ORG_KEY),
  ]);
}

export async function saveOrgSlug(slug: string): Promise<void> {
  await setSecureItem(ORG_KEY, slug);
}

export type { OrganizationBranding };
