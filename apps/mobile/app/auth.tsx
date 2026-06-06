import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppLogo } from "@/components/AppLogo";
import { exchangeMagicToken } from "@/lib/api";
import { saveSession } from "@/lib/storage";
import { useSession } from "@/lib/session-context";
import { useBrand } from "@/lib/theme";
import { useAppTheme } from "@/lib/useAppTheme";

export default function AuthDeepLinkScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { setBrand } = useBrand();
  const { refreshSession } = useSession();
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
        await refreshSession();
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
          <AppLogo size={80} rounded="ios" />
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 24 }} />
          <Text style={{ fontSize: 16, color: colors.onHeader, marginTop: 16 }}>
            Entrando…
          </Text>
        </>
      ) : (
        <View style={[styles.card, { width: "100%", maxWidth: 340, alignItems: "center" }]}>
          <AppLogo size={56} rounded="ios" style={{ marginBottom: 16 }} />
          <Text style={[styles.errorText, { textAlign: "center" }]}>{error}</Text>
          <Pressable
            style={[styles.btnPrimary, { marginTop: 16, width: "100%" }]}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.btnPrimaryText}>Volver al login</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
