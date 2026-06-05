import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AppLogo } from "@/components/AppLogo";
import { bootstrap, fetchOrgBranding, requestMagicLink } from "@/lib/api";
import { getAccessToken, getOrgSlug, saveOrgSlug } from "@/lib/storage";
import { useBrand } from "@/lib/theme";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

export default function LoginScreen() {
  const { brand, setBrand } = useBrand();
  const { colors, styles } = useAppTheme();
  const [orgSlug, setOrgSlug] = useState("hernandez");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
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
    try {
      await saveOrgSlug(orgSlug.trim().toLowerCase());
      await requestMagicLink(
        email.trim().toLowerCase(),
        orgSlug.trim().toLowerCase(),
        intent
      );
      setSentEmail(email.trim().toLowerCase());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.header }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (sentEmail) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.header }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
          <View style={[styles.hero, { paddingTop: 56, minHeight: 140 }]}>
            <Text style={[styles.heroTitle, { fontSize: 22 }]}>Acceso seguro</Text>
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
            <View style={[styles.card, { alignItems: "center" }]}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: "rgba(63, 94, 120, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Ionicons name="mail-outline" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.title, { textAlign: "center" }]}>Revisa tu correo</Text>
              <Text style={[styles.subtitle, { textAlign: "center", marginTop: 8 }]}>
                Te enviamos un magic link para entrar a {brand.appTitle}.
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: colors.primary,
                  marginTop: 12,
                }}
              >
                {sentEmail}
              </Text>
              <Text style={[styles.subtitle, { textAlign: "center", marginTop: 8 }]}>
                Abre el enlace desde tu iPhone para continuar.
              </Text>
              <View
                style={{
                  marginTop: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: webBrand.off,
                }}
              >
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  Organización: <Text style={{ fontWeight: "700" }}>{orgSlug}</Text>
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  marginTop: 20,
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <Pressable onPress={() => setSentEmail(null)}>
                  <Text style={styles.link}>Cambiar email</Text>
                </Pressable>
                <Text style={{ color: colors.border }}>|</Text>
                <Pressable onPress={() => setSentEmail(null)}>
                  <Text style={styles.link}>Volver</Text>
                </Pressable>
              </View>

              <Pressable
                style={[styles.btnPrimary, { width: "100%" }]}
                onPress={() => void Linking.openURL("message:")}
              >
                <Text style={styles.btnPrimaryText}>Abrir mi correo</Text>
              </Pressable>

              <Pressable
                style={[styles.btnOutline, { width: "100%", marginTop: 10 }]}
                onPress={() => void onSendLink("staff")}
                disabled={sending}
              >
                <Text style={styles.btnOutlineText}>
                  {sending ? "Enviando…" : "Reenviar enlace"}
                </Text>
              </Pressable>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 20,
                }}
              >
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSubtle} />
                <Text style={{ fontSize: 12, color: colors.textSubtle }}>
                  Solo personal autorizado puede acceder.
                </Text>
              </View>
            </View>

            <Text
              style={{
                textAlign: "center",
                fontSize: 12,
                color: colors.textSubtle,
                marginTop: 20,
              }}
            >
              pass.edgardohernandez.com
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
        <View style={[styles.hero, { alignItems: "center", paddingTop: 56 }]}>
          <AppLogo size={72} style={{ marginBottom: 16, borderWidth: 0 }} />
          <Text style={[styles.heroTitle, { textAlign: "center" }]}>{brand.appTitle}</Text>
          <Text style={[styles.heroSubtitle, { textAlign: "center" }]}>
            Acceso de staff para eventos
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
              Entra con tus credenciales del evento
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

            <Text style={styles.label}>Email del staff</Text>
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
              style={[styles.btnSecondary, { marginTop: 10, width: "100%" }, sending && { opacity: 0.7 }]}
              onPress={() => void onSendLink("admin")}
              disabled={sending}
            >
              <Text style={styles.btnSecondaryText}>Entrar como Admin</Text>
            </Pressable>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 16,
                justifyContent: "center",
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSubtle} />
              <Text style={{ fontSize: 12, color: colors.textSubtle, textAlign: "center" }}>
                Recibirás un enlace seguro para acceder.
              </Text>
            </View>
          </View>

          <Text
            style={{
              textAlign: "center",
              fontSize: 12,
              color: colors.textSubtle,
              marginTop: 20,
            }}
          >
            pass.edgardohernandez.com
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
