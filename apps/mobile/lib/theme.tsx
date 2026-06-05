import React, { createContext, useContext, useMemo } from "react";
import type { OrganizationBranding } from "./types";

const DEFAULT_BRAND: OrganizationBranding = {
  id: "",
  slug: "hernandez",
  name: "Hernandez Pass",
  displayName: "Hernandez Pass",
  appTitle: "Hernandez Pass",
  logoUrl: null,
  primaryColor: "#1a1a1a",
  accentColor: "#c9a227",
  supportEmail: null,
  customDomain: null,
};

type ThemeContextValue = {
  brand: OrganizationBranding;
  setBrand: (b: OrganizationBranding) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  brand: DEFAULT_BRAND,
  setBrand: () => undefined,
});

export function ThemeProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial?: OrganizationBranding;
}) {
  const [brand, setBrand] = React.useState(initial ?? DEFAULT_BRAND);
  const value = useMemo(() => ({ brand, setBrand }), [brand]);
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useBrand() {
  return useContext(ThemeContext);
}
