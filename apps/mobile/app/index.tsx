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
import { DEFAULT_ORG_SLUG } from "@/constants/config";
import {
  bootstrap,
  fetchOrgBranding,
  isDemoLoginEnabled,
  isAuthSessionError,
  loginWithDemoCredentials,
  requestMagicLink,
} from "@/lib/api";
import { getAccessToken, saveSession } from "@/lib/storage";
import { useSession } from "@/lib/session-context";
import { useBrand } from "@/lib/theme";
import { useAppTheme } from "@/lib/useAppTheme";

export default function LoginScreen() {
  const { brand, setBrand } = useBrand();
  const { refreshSession } = useSession();
  const { colors, styles } = useAppTheme();
  const [email, setEmail] = useState("");
  const [demoEmail, setDemoEmail] = useState("");
  const [demoPassword, setDemoPassword] = useState("");
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
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
        } catch (error) {
          if (isAuthSessionError(error)) {
            /* token cleared in apiFetch */
          } else {
            // Network blip on cold start: enter with stored token.
            router.replace("/(main)");
            return;
          }
        }
      }
      try {
        const org = await fetchOrgBranding(DEFAULT_ORG_SLUG);
        setBrand(org);
      } catch {
        /* optional */
      }
      try {
        setDemoEnabled(await isDemoLoginEnabled());
      } catch {
        setDemoEnabled(false);
      }
      setLoading(false);
    })();
  }, [setBrand]);

  async function onSendLink(intent: "staff" | "admin") {
    setSending(true);
    setError(null);
    try {
      await requestMagicLink(email.trim().toLowerCase(), intent);
      setSentEmail(email.trim().toLowerCase());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setSending(false);
    }
  }

  async function onDemoLogin() {
    setDemoLoading(true);
    setError(null);
    try {
      const { accessToken, organization } = await loginWithDemoCredentials(
        demoEmail.trim().toLowerCase(),
        demoPassword
      );
      await saveSession(accessToken, organization.slug);
      setBrand(organization);
      await refreshSession();
      router.replace("/(main)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo entrar");
    } finally {
      setDemoLoading(false);
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
            <Text style={[styles.fieldLabel, { marginTop: 0 }]}>Email del staff</Text>
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
                {sending ? "Enviando…" : "Enviar enlace de acceso"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.btnSecondary, sending && { opacity: 0.7 }]}
              onPress={() => void Linking.openURL("https://pass.edgardohernandez.com/login?intent=admin&next=/admin")}
              disabled={sending}
            >
              <Text style={styles.btnSecondaryText}>Admin en la web</Text>
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
            {demoEnabled ? (
              <View style={{ marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Pressable onPress={() => setShowDemo((v) => !v)}>
                  <Text style={[styles.link, { textAlign: "center" }]}>
                    {showDemo ? "Ocultar acceso demo" : "Acceso demo para revisión"}
                  </Text>
                </Pressable>
                {showDemo ? (
                  <View style={{ marginTop: 14, gap: 0 }}>
                    <Text style={[styles.subtitle, { marginBottom: 12, textAlign: "center" }]}>
                      Para revisión de App Store. Usa las credenciales indicadas en TestFlight.
                    </Text>
                    <Text style={styles.fieldLabel}>Usuario demo</Text>
                    <TextInput
                      style={styles.input}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={demoEmail}
                      onChangeText={setDemoEmail}
                      placeholder="usuario@demo.com"
                      placeholderTextColor={colors.textSubtle}
                    />
                    <Text style={styles.fieldLabel}>Contraseña</Text>
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      autoCapitalize="none"
                      value={demoPassword}
                      onChangeText={setDemoPassword}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textSubtle}
                    />
                    <Pressable
                      style={[
                        styles.btnOutline,
                        (demoLoading || !demoEmail.trim() || !demoPassword) && { opacity: 0.7 },
                      ]}
                      onPress={() => void onDemoLogin()}
                      disabled={demoLoading || !demoEmail.trim() || !demoPassword}
                    >
                      <Text style={styles.btnStaffText}>
                        {demoLoading ? "Entrando…" : "Entrar demo"}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}
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
