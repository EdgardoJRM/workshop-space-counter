import Constants from "expo-constants";

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  Constants.expoConfig?.extra?.apiBaseUrl ??
  "https://pass.edgardohernandez.com"
).replace(/\/$/, "");

/** Única organización en producción (slug en Supabase). */
export const DEFAULT_ORG_SLUG = "hernandez";
