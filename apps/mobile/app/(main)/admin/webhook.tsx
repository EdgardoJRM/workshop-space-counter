import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { fetchWebhookInfo, testWebhook } from "@/lib/admin-api";
import { useAppTheme } from "@/lib/useAppTheme";

export default function AdminWebhookScreen() {
  const { colors, styles } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [secretConfigured, setSecretConfigured] = useState(false);
  const [secretSource, setSecretSource] = useState<"org" | "env" | null>(null);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchWebhookInfo();
        setWebhookUrl(data.webhookUrl);
        setSecretConfigured(data.secretConfigured);
        setSecretSource(data.secretSource);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function copyUrl() {
    await Clipboard.setStringAsync(webhookUrl);
    Alert.alert("Copiado", "URL del webhook copiada al portapapeles.");
  }

  async function runTest() {
    setTesting(true);
    setTestMessage(null);
    setError(null);
    try {
      const result = await testWebhook();
      setTestMessage(`HTTP ${result.status}: ${result.message}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al probar");
    } finally {
      setTesting(false);
    }
  }

  return (
    <ScrollView style={styles.screenPadded}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>ClickFunnels</Text>
          <Text style={[styles.subtitle, { marginBottom: 12 }]}>
            ClickFunnels V2 firma cada POST automáticamente. El secreto en Vercel (
            CLICKFUNNELS_WEBHOOK_SECRET) debe ser el webhook secret del endpoint en CF, no un
            valor inventado.
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.text,
              lineHeight: 20,
              marginBottom: 12,
            }}
            selectable
          >
            {webhookUrl}
          </Text>
          <Pressable style={styles.btnPrimary} onPress={() => void copyUrl()}>
            <Text style={styles.btnPrimaryText}>Copiar URL</Text>
          </Pressable>
          <View style={[styles.badge, secretConfigured ? styles.badgeSuccess : undefined, { marginTop: 16 }]}>
            <Text
              style={[
                styles.badgeText,
                secretConfigured ? styles.badgeSuccessText : undefined,
              ]}
            >
              {secretConfigured
                ? `Secreto configurado${secretSource ? ` (${secretSource})` : ""}`
                : "Falta CLICKFUNNELS_WEBHOOK_SECRET"}
            </Text>
          </View>
          <Pressable
            style={[styles.btnPrimary, { marginTop: 12, opacity: secretConfigured && !testing ? 1 : 0.5 }]}
            onPress={() => void runTest()}
            disabled={!secretConfigured || testing}
          >
            <Text style={styles.btnPrimaryText}>
              {testing ? "Probando…" : "Probar webhook"}
            </Text>
          </Pressable>
          {testMessage ? (
            <Text style={[styles.subtitle, { marginTop: 12 }]}>{testMessage}</Text>
          ) : null}
        </View>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
}
