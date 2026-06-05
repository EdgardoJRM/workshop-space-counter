import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import type { OrganizationBranding } from "./types";

/** Hernandez Pass web palette — tailwind.config.ts */
export const webBrand = {
  slate: "#3f5e78",
  charcoal: "#4c5c68",
  off: "#f2f2f2",
  ink: "#222022",
  gold: "#ffc907",
  blue: "#2885d2",
  grey: "#a5a5a5",
  white: "#ffffff",
  border: "rgba(76, 92, 104, 0.18)",
  error: "#c4472b",
  success: "#2d6a4f",
  heroDark: "#2a3540",
} as const;

export type AppColors = {
  background: string;
  surface: string;
  header: string;
  accent: string;
  primary: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  link: string;
  border: string;
  error: string;
  success: string;
  onHeader: string;
  onAccent: string;
};

export function colorsFromBrand(brand: OrganizationBranding): AppColors {
  const header = brand.primaryColor?.trim() || webBrand.slate;
  const accent = brand.accentColor?.trim() || webBrand.gold;
  return {
    background: webBrand.off,
    surface: webBrand.white,
    header,
    accent,
    primary: webBrand.slate,
    text: webBrand.ink,
    textMuted: webBrand.charcoal,
    textSubtle: webBrand.grey,
    link: webBrand.blue,
    border: webBrand.border,
    error: webBrand.error,
    success: webBrand.success,
    onHeader: webBrand.white,
    onAccent: webBrand.ink,
  };
}

export const cardShadow: ViewStyle = {
  shadowColor: webBrand.ink,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

export function createUiStyles(c: AppColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    screenPadded: {
      flex: 1,
      backgroundColor: c.background,
      padding: 16,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: c.background,
      padding: 24,
    },
    hero: {
      flex: 1,
      backgroundColor: c.header,
      paddingHorizontal: 24,
      paddingTop: 48,
      paddingBottom: 32,
      justifyContent: "flex-end",
    },
    heroKicker: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 2,
      textTransform: "uppercase",
      color: c.accent,
      marginBottom: 8,
    },
    heroTitle: {
      fontSize: 32,
      fontWeight: "700",
      color: c.onHeader,
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      fontSize: 15,
      color: "rgba(255,255,255,0.82)",
      marginTop: 8,
      lineHeight: 22,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: c.border,
      ...cardShadow,
    },
    cardFlat: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: c.textSubtle,
      marginBottom: 8,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: c.text,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 14,
      color: c.textMuted,
      lineHeight: 20,
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textMuted,
      marginBottom: 6,
      marginTop: 12,
    },
    input: {
      backgroundColor: webBrand.off,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 16,
      color: c.text,
    },
    btnPrimary: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 20,
    },
    btnPrimaryText: {
      color: c.onAccent,
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    btnSecondary: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: "center",
    },
    btnSecondaryText: {
      color: c.onHeader,
      fontSize: 13,
      fontWeight: "600",
    },
    btnOutline: {
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1.5,
      borderColor: c.accent,
      alignItems: "center",
    },
    btnOutlineText: {
      color: c.text,
      fontSize: 13,
      fontWeight: "600",
    },
    btnDanger: {
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1.5,
      borderColor: "#dc2626",
      alignItems: "center",
    },
    btnDangerText: {
      color: "#dc2626",
      fontSize: 13,
      fontWeight: "600",
    },
    badge: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: "rgba(63, 94, 120, 0.12)",
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: c.primary,
    },
    badgeSuccess: {
      backgroundColor: "rgba(45, 106, 79, 0.12)",
    },
    badgeSuccessText: {
      color: c.success,
    },
    badgeGold: {
      backgroundColor: "rgba(255, 201, 7, 0.25)",
    },
    errorText: {
      fontSize: 13,
      color: c.error,
      marginTop: 8,
    },
    okText: {
      fontSize: 13,
      color: c.success,
      marginTop: 8,
      lineHeight: 18,
    },
    link: {
      fontSize: 15,
      color: c.link,
      fontWeight: "600",
    },
    rowCard: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      borderWidth: 2,
      borderColor: "transparent",
      ...cardShadow,
    },
    rowCardActive: {
      borderColor: c.accent,
    },
    rowTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
    },
    rowMeta: {
      fontSize: 13,
      color: c.textMuted,
      marginTop: 4,
    },
    metricValue: {
      fontSize: 28,
      fontWeight: "700",
      color: c.text,
    },
    metricLabel: {
      fontSize: 12,
      color: c.textSubtle,
      marginTop: 2,
    },
    logout: {
      marginTop: 16,
      paddingVertical: 14,
      alignItems: "center",
    },
    logoutText: {
      fontSize: 14,
      color: c.textSubtle,
      fontWeight: "500",
    },
  });
}

export type UiStyles = ReturnType<typeof createUiStyles>;
