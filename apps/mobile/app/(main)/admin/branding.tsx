import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppLogo } from "@/components/AppLogo";
import { InfoBanner } from "@/components/InfoBanner";
import { SectionCard } from "@/components/SectionCard";
import { patchBranding } from "@/lib/admin-api";
import { useBrand } from "@/lib/theme";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

export default function AdminBrandingScreen() {
  const { brand, setBrand } = useBrand();
  const { colors, styles } = useAppTheme();
  const [displayName, setDisplayName] = useState(brand.displayName);
  const [appTitle, setAppTitle] = useState(brand.appTitle);
  const [primaryColor, setPrimaryColor] = useState(brand.primaryColor);
  const [accentColor, setAccentColor] = useState(brand.accentColor);
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const data = await patchBranding({
        displayName: displayName.trim(),
        appTitle: appTitle.trim(),
        primaryColor: primaryColor.trim(),
        accentColor: accentColor.trim(),
        supportEmail: brand.supportEmail,
      });
      const org = (data as { organization: typeof brand }).organization;
      if (org) setBrand(org);
      setOk("Marca actualizada");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screenPadded} keyboardShouldPersistTaps="handled">
      <SectionCard icon="color-palette-outline" title="Configuración de marca">
        <Text style={styles.fieldLabel}>Nombre público</Text>
        <Text style={[styles.subtitle, { marginTop: -4, marginBottom: 8 }]}>
          Se muestra a los asistentes
        </Text>
        <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} />

        <Text style={styles.fieldLabel}>Título de la app</Text>
        <Text style={[styles.subtitle, { marginTop: -4, marginBottom: 8 }]}>
          Se muestra en la barra superior
        </Text>
        <TextInput style={styles.input} value={appTitle} onChangeText={setAppTitle} />

        <Text style={styles.fieldLabel}>Color primario</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: primaryColor,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={primaryColor}
            onChangeText={setPrimaryColor}
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.fieldLabel}>Color de acento</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: accentColor,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={accentColor}
            onChangeText={setAccentColor}
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.fieldLabel}>URL del logo</Text>
        <Text style={[styles.subtitle, { marginTop: -4, marginBottom: 8 }]}>
          Recomendado 512×512, fondo transparente (la app usa el icono HP)
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: webBrand.white,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 12,
          }}
        >
          <Ionicons name="link-outline" size={18} color={colors.textSubtle} />
          <TextInput
            style={[styles.input, { flex: 1, borderWidth: 0, backgroundColor: "transparent" }]}
            value={logoUrl}
            onChangeText={setLogoUrl}
            autoCapitalize="none"
            placeholder="https://…"
            placeholderTextColor={colors.textSubtle}
          />
        </View>
      </SectionCard>

      <SectionCard icon="eye-outline" title="Vista previa">
        <Text style={[styles.subtitle, { marginBottom: 12 }]}>
          Así se verá la app con tu marca aplicada.
        </Text>
        <View
          style={{
            borderRadius: 12,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              backgroundColor: primaryColor,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AppLogo size={36} rounded="ios" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: webBrand.white, fontWeight: "700", fontSize: 14 }}>
                {displayName || brand.displayName}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>
                {appTitle || brand.appTitle}
              </Text>
            </View>
            <Ionicons name="wifi-outline" size={18} color={webBrand.white} />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              paddingVertical: 10,
              backgroundColor: webBrand.white,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            {(["Escanear", "Lista", "Impresora", "Admin"] as const).map((tab, i) => (
              <Text
                key={tab}
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: i === 0 ? accentColor : colors.textSubtle,
                }}
              >
                {tab}
              </Text>
            ))}
          </View>
          <View style={{ padding: 16, backgroundColor: webBrand.off, gap: 8 }}>
            <View
              style={{
                width: 80,
                height: 80,
                backgroundColor: "rgba(165,165,165,0.3)",
                borderRadius: 8,
              }}
            />
            <View style={{ height: 10, width: "70%", backgroundColor: "rgba(165,165,165,0.25)", borderRadius: 4 }} />
            <View style={{ height: 10, width: "50%", backgroundColor: "rgba(165,165,165,0.2)", borderRadius: 4 }} />
          </View>
        </View>
      </SectionCard>

      <InfoBanner>
        Esta configuración aplica a la app móvil y a los emails automáticos. Los cambios se
        reflejarán inmediatamente.
      </InfoBanner>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {ok ? <Text style={styles.okText}>{ok}</Text> : null}

      <Pressable
        style={[styles.btnPrimary, styles.btnWithIcon, saving && { opacity: 0.7 }]}
        onPress={() => void save()}
        disabled={saving}
      >
        <Ionicons name="save-outline" size={20} color={colors.onAccent} />
        <Text style={styles.btnPrimaryText}>{saving ? "Guardando…" : "Guardar marca"}</Text>
      </Pressable>
    </ScrollView>
  );
}
