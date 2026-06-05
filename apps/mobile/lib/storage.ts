import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OrganizationBranding } from "./types";

const TOKEN_KEY = "hp_access_token";
const ORG_KEY = "hp_org_slug";

export async function saveSession(
  accessToken: string,
  orgSlug: string
): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, accessToken],
    [ORG_KEY, orgSlug],
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getOrgSlug(): Promise<string | null> {
  return AsyncStorage.getItem(ORG_KEY);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, ORG_KEY]);
}

export async function saveOrgSlug(slug: string): Promise<void> {
  await AsyncStorage.setItem(ORG_KEY, slug);
}
