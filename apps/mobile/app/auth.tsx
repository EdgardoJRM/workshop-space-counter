import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { exchangeMagicToken } from "@/lib/api";
import { saveSession } from "@/lib/storage";
import { useBrand } from "@/lib/theme";

export default function AuthDeepLinkScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { setBrand } = useBrand();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof token === "string" ? token : "";
    if (!t) {
      setError("Token inválido");
      return;
    }
    void (async () => {
      try {
        const { accessToken, organization } = await exchangeMagicToken(t);
        await saveSession(accessToken, organization.slug);
        setBrand(organization);
        router.replace("/(main)");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo entrar");
      }
    })();
  }, [token]);

  return (
    <View style={styles.centered}>
      {!error ? (
        <>
          <ActivityIndicator size="large" />
          <Text style={styles.text}>Entrando…</Text>
        </>
      ) : (
        <>
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.link} onPress={() => router.replace("/")}>
            Volver al login
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  text: { fontSize: 16, color: "#333" },
  error: { fontSize: 16, color: "#b00020", textAlign: "center" },
  link: { fontSize: 16, color: "#0066cc", marginTop: 8 },
});
