import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { bootstrap } from "@/lib/api";
import { clearSession, getAccessToken } from "@/lib/storage";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const token = await getAccessToken();
      if (!token) {
        router.replace("/");
        return;
      }
      try {
        const data = await bootstrap();
        if (!data.authenticated) {
          await clearSession();
          router.replace("/");
          return;
        }
        setReady(true);
      } catch {
        await clearSession();
        router.replace("/");
      }
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
