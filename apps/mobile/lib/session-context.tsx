import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { bootstrap } from "./api";
import type { WorkshopSlug } from "./workshops";
import { WORKSHOP_SLUGS } from "./workshops";

const WORKSHOP_KEY = "hp_admin_workshop";

type SessionContextValue = {
  loaded: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  email: string | null;
  workshop: WorkshopSlug;
  setWorkshop: (slug: WorkshopSlug) => void;
  refreshSession: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [workshop, setWorkshopState] = useState<WorkshopSlug>("duplica-ventas");

  const refreshSession = useCallback(async () => {
    try {
      const data = await bootstrap();
      setIsAdmin(Boolean(data.permissions?.admin));
      setIsStaff(Boolean(data.permissions?.staff));
      setEmail(data.email ?? null);
    } catch {
      setIsAdmin(false);
      setIsStaff(false);
      setEmail(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const setWorkshop = useCallback((slug: WorkshopSlug) => {
    setWorkshopState(slug);
    void import("@react-native-async-storage/async-storage").then(({ default: AS }) =>
      AS.setItem(WORKSHOP_KEY, slug)
    );
  }, []);

  useEffect(() => {
    void import("@react-native-async-storage/async-storage").then(async ({ default: AS }) => {
      const saved = await AS.getItem(WORKSHOP_KEY);
      if (saved && WORKSHOP_SLUGS.includes(saved as WorkshopSlug)) {
        setWorkshopState(saved as WorkshopSlug);
      }
    });
  }, []);

  const value = useMemo(
    () => ({
      loaded,
      isAdmin,
      isStaff,
      email,
      workshop,
      setWorkshop,
      refreshSession,
    }),
    [loaded, isAdmin, isStaff, email, workshop, setWorkshop, refreshSession]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
