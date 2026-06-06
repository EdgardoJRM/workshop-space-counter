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
import { AuthHeroSheet } from "@/components/AuthHeroSheet";
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
          /* expired */
        }
      }
      const savedSlug = await getOrgSlug();
      if (savedSlug) setOrgSlug(savedSlug);
      try {
        const org = await fetchOrgBranding(savedSlug ?? orgSlug);
        setBrand(org);
      } catch {
        /* optional */
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
        <AppLogo size={88} rounded="ios" />
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (sentEmail) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
          <AuthHeroSheet
            heroMinHeight={160}
            hero={
              <Text style={[styles.heroTitle, { fontSize: 22, textAlign: "center" }]}>
                Acceso seguro
              </Text>
            }
          >
            <View style={[styles.card, { alignItems: "center" }]}>
              <View style={{ marginBottom: 16, alignItems: "center" }}>
                <Ionicons name="mail-outline" size={56} color={colors.header} />
                <View style={{ marginTop: -12 }}>
                  <Ionicons name="shield-checkmark" size={28} color={colors.header} />
                </View>
              </View>
              <Text style={[styles.title, { textAlign: "center", fontSize: 24 }]}>
                Revisa tu correo
              </Text>
              <Text style={[styles.subtitle, { textAlign: "center", marginTop: 10 }]}>
                Te enviamos un magic link para entrar a {brand.appTitle}.
              </Text>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: colors.header,
                  marginTop: 14,
                }}
              >
                {sentEmail}
              </Text>
              <Text style={[styles.subtitle, { textAlign: "center", marginTop: 10 }]}>
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
                <Text style={styles.btnStaffText}>Abrir mi correo</Text>
              </Pressable>
              <Pressable
                style={[styles.btnOutline, { width: "100%", marginTop: 10 }]}
                onPress={() => void onSendLink("staff")}
                disabled={sending}
              >
                <Text style={styles.btnStaffText}>
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
                <Ionicons name="lock-closed-outline" size={14} color={colors.textSubtle} />
                <Text style={{ fontSize: 12, color: colors.textSubtle, textAlign: "center" }}>
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
          </AuthHeroSheet>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
      >
        <AuthHeroSheet
          hero={
            <View style={{ alignItems: "center", marginTop: 8 }}>
              <AppLogo size={92} rounded="ios" style={{ marginBottom: 12 }} />
              <Text style={[styles.heroTitle, { fontSize: 26, textAlign: "center" }]}>
                {brand.appTitle}
              </Text>
              <Text
                style={[
                  styles.heroSubtitle,
                  { textAlign: "center", marginTop: 6, color: colors.link },
                ]}
              >
                Acceso de staff para eventos
              </Text>
            </View>
          }
        >
          <View style={styles.card}>
            <Text style={styles.loginKicker}>Iniciar sesión</Text>
            <Text style={[styles.subtitle, { marginBottom: 16 }]}>
              Entra con tus credenciales del evento
            </Text>
            <Text style={[styles.fieldLabel, { marginTop: 0 }]}>Código del negocio</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              value={orgSlug}
              onChangeText={setOrgSlug}
              onBlur={() => void onPreviewOrg(orgSlug)}
              placeholder="hernandez"
              placeholderTextColor={colors.textSubtle}
            />
            <Text style={styles.fieldLabel}>Email del staff</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
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
              <Text style={styles.btnStaffText}>
                {sending ? "Enviando…" : "Entrar como Staff"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.btnSecondary, sending && { opacity: 0.7 }]}
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
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.textSubtle} />
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
        </AuthHeroSheet>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
