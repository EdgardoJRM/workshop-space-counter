import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { exchangeMagicToken } from "@/lib/api";
import { saveSession } from "@/lib/storage";
import { useBrand } from "@/lib/theme";
import { useAppTheme } from "@/lib/useAppTheme";

export default function AuthDeepLinkScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { setBrand } = useBrand();
  const { colors, styles } = useAppTheme();
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
    <View style={[styles.centered, { backgroundColor: colors.header }]}>
      {!error ? (
        <>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ fontSize: 16, color: colors.onHeader, marginTop: 16 }}>
            Entrando…
          </Text>
        </>
      ) : (
        <View style={[styles.card, { width: "100%", maxWidth: 340 }]}>
          <Text style={[styles.errorText, { textAlign: "center" }]}>{error}</Text>
          <Pressable
            style={[styles.btnPrimary, { marginTop: 16 }]}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.btnPrimaryText}>Volver al login</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
