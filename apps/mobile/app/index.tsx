import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { bootstrap, fetchOrgBranding, requestMagicLink } from "@/lib/api";
import { getAccessToken, getOrgSlug, saveOrgSlug } from "@/lib/storage";
import { useBrand } from "@/lib/theme";
import { useAppTheme } from "@/lib/useAppTheme";

export default function LoginScreen() {
  const { brand, setBrand } = useBrand();
  const { colors, styles } = useAppTheme();
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
      setError(null);
    } catch {
      setError("Negocio no encontrado");
    }
  }

  async function onSendLink(intent: "staff" | "admin") {
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      await saveOrgSlug(orgSlug.trim().toLowerCase());
      await requestMagicLink(
        email.trim().toLowerCase(),
        orgSlug.trim().toLowerCase(),
        intent
      );
      setMessage(
        intent === "admin"
          ? "Revisa tu correo para entrar como administrador (pestaña Admin en la app)."
          : "Revisa tu correo y abre el enlace para entrar. Si no abre la app, vuelve aquí después."
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
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.header }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>Staff · Check-in</Text>
          <Text style={styles.heroTitle}>{brand.appTitle}</Text>
          <Text style={styles.heroSubtitle}>
            {brand.displayName || brand.name}
            {"\n"}Acceso solo para personal autorizado del evento.
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            marginTop: -16,
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: 32,
          }}
        >
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Iniciar sesión</Text>
            <Text style={[styles.subtitle, { marginBottom: 4 }]}>
              Check-in para tu evento
            </Text>

            <Text style={styles.label}>Código del negocio</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              value={orgSlug}
              onChangeText={setOrgSlug}
              onBlur={() => void onPreviewOrg(orgSlug)}
              placeholder="ej. hernandez"
              placeholderTextColor={colors.textSubtle}
            />

            <Text style={styles.label}>Tu email (staff)</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              placeholderTextColor={colors.textSubtle}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {message ? <Text style={styles.okText}>{message}</Text> : null}

            <Pressable
              style={[styles.btnPrimary, sending && { opacity: 0.7 }]}
              onPress={() => void onSendLink("staff")}
              disabled={sending}
            >
              <Text style={styles.btnPrimaryText}>
                {sending ? "Enviando…" : "Entrar como Staff"}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.btnSecondary, { marginTop: 10 }, sending && { opacity: 0.7 }]}
              onPress={() => void onSendLink("admin")}
              disabled={sending}
            >
              <Text style={styles.btnSecondaryText}>
                Entrar como Admin
              </Text>
            </Pressable>
          </View>

          <Text
            style={{
              textAlign: "center",
              fontSize: 12,
              color: colors.textSubtle,
              marginTop: 20,
              lineHeight: 18,
            }}
          >
            pass.edgardohernandez.com
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
