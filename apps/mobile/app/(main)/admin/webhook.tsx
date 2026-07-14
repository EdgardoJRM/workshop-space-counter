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
  const [workshopUrls, setWorkshopUrls] = useState<
    { slug: string; label: string; webhookUrl: string }[]
  >([]);
  const [genericUrl, setGenericUrl] = useState("");
  const [secretConfigured, setSecretConfigured] = useState(false);
  const [secretSource, setSecretSource] = useState<"org" | "env" | null>(null);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchWebhookInfo();
        setWorkshopUrls(data.workshopUrls ?? []);
        setGenericUrl(data.webhookUrl);
        setSecretConfigured(data.secretConfigured);
        setSecretSource(data.secretSource);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function copyUrl(url: string, label: string) {
    await Clipboard.setStringAsync(url);
    Alert.alert("Copiado", `URL de ${label} copiada.`);
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
          <Text style={[styles.subtitle, { marginBottom: 16, lineHeight: 22 }]}>
            Usa una URL por taller. Las compras van a la fecha en venta de ese taller.
            El flujo AT&amp;T debe usar la URL de Duplica Ventas.
          </Text>

          {workshopUrls.map((w) => (
            <View key={w.slug} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                {w.label}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.text,
                  lineHeight: 20,
                  marginTop: 6,
                }}
                selectable
              >
                {w.webhookUrl}
              </Text>
              <Pressable
                style={[styles.btnPrimary, { marginTop: 10 }]}
                onPress={() => void copyUrl(w.webhookUrl, w.label)}
              >
                <Text style={styles.btnPrimaryText}>Copiar URL</Text>
              </Pressable>
            </View>
          ))}

          <Text style={[styles.rowMeta, { marginTop: 8 }]}>URL genérica (sin taller fijo)</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }} selectable>
            {genericUrl}
          </Text>

          <View
            style={[
              styles.badge,
              secretConfigured ? styles.badgeSuccess : undefined,
              { marginTop: 16 },
            ]}
          >
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
            style={[
              styles.btnPrimary,
              { marginTop: 12, opacity: secretConfigured && !testing ? 1 : 0.5 },
            ]}
            onPress={() => void runTest()}
            disabled={!secretConfigured || testing}
          >
            <Text style={styles.btnPrimaryText}>
              {testing ? "Probando…" : "Probar webhook (Duplica)"}
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
