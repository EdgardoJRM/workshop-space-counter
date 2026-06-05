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
import { fetchWebhookInfo } from "@/lib/admin-api";
import { useAppTheme } from "@/lib/useAppTheme";

export default function AdminWebhookScreen() {
  const { colors, styles } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [secretConfigured, setSecretConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchWebhookInfo();
        setWebhookUrl(data.webhookUrl);
        setSecretConfigured(data.secretConfigured);
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

  return (
    <ScrollView style={styles.screenPadded}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>ClickFunnels</Text>
          <Text style={[styles.subtitle, { marginBottom: 12 }]}>
            Header: X-Webhook-Secret con el secreto configurado en el servidor.
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
                ? "Secreto configurado"
                : "Falta CLICKFUNNELS_WEBHOOK_SECRET"}
            </Text>
          </View>
        </View>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
}
