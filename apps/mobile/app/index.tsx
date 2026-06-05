import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { bootstrap, fetchOrgBranding, requestMagicLink } from "@/lib/api";
import { getAccessToken, getOrgSlug, saveOrgSlug } from "@/lib/storage";
import { useBrand } from "@/lib/theme";

export default function LoginScreen() {
  const { brand, setBrand } = useBrand();
  const [orgSlug, setOrgSlug] = useState("hernandez");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const token = await getAccessToken();
      if (token) {
        try {
          const data = await bootstrap();
          if (data.authenticated && data.organization) {
            setBrand(data.organization);
            router.replace("/(main)");
            return;
          }
        } catch {
          /* session expired */
        }
      }
      const savedSlug = await getOrgSlug();
      if (savedSlug) setOrgSlug(savedSlug);
      try {
        const org = await fetchOrgBranding(savedSlug ?? orgSlug);
        setBrand(org);
      } catch {
        /* preview optional */
      }
      setLoading(false);
    })();
  }, []);

  async function onPreviewOrg(slug: string) {
    try {
      const org = await fetchOrgBranding(slug.trim().toLowerCase());
      setBrand(org);
      await saveOrgSlug(org.slug);
      setOrgSlug(org.slug);
    } catch {
      setError("Negocio no encontrado");
    }
  }

  async function onSendLink() {
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      await saveOrgSlug(orgSlug.trim().toLowerCase());
      await requestMagicLink(email.trim().toLowerCase(), orgSlug.trim().toLowerCase());
      setMessage(
        "Revisa tu correo y abre el enlace para entrar. Si no abre la app, vuelve aquí después."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={brand.accentColor} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: brand.primaryColor }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{brand.appTitle}</Text>
        <Text style={styles.subtitle}>Check-in para tu evento</Text>

        <Text style={styles.label}>Código del negocio</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          value={orgSlug}
          onChangeText={setOrgSlug}
          onBlur={() => void onPreviewOrg(orgSlug)}
          placeholder="ej. hernandez"
        />

        <Text style={styles.label}>Tu email (staff)</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="tu@correo.com"
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {message && <Text style={styles.ok}>{message}</Text>}

        <Pressable
          style={[styles.button, { backgroundColor: brand.accentColor }]}
          onPress={() => void onSendLink()}
          disabled={sending}
        >
          <Text style={styles.buttonText}>
            {sending ? "Enviando…" : "Enviar enlace mágico"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    gap: 8,
  },
  title: { fontSize: 26, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "600", color: "#444", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  button: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#111", fontWeight: "700", fontSize: 16 },
  error: { color: "#b00020", fontSize: 13 },
  ok: { color: "#0a7a32", fontSize: 13 },
});
