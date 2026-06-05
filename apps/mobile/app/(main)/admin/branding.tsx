import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { patchBranding } from "@/lib/admin-api";
import { useBrand } from "@/lib/theme";
import { useAppTheme } from "@/lib/useAppTheme";

export default function AdminBrandingScreen() {
  const { brand, setBrand } = useBrand();
  const { colors, styles } = useAppTheme();
  const [displayName, setDisplayName] = useState(brand.displayName);
  const [appTitle, setAppTitle] = useState(brand.appTitle);
  const [primaryColor, setPrimaryColor] = useState(brand.primaryColor);
  const [accentColor, setAccentColor] = useState(brand.accentColor);
  const [supportEmail, setSupportEmail] = useState(brand.supportEmail ?? "");
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
        supportEmail: supportEmail.trim() || null,
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
      <View style={styles.card}>
        <Text style={styles.label}>Nombre para mostrar</Text>
        <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} />
        <Text style={styles.label}>Título de la app</Text>
        <TextInput style={styles.input} value={appTitle} onChangeText={setAppTitle} />
        <Text style={styles.label}>Color primario (header)</Text>
        <TextInput style={styles.input} value={primaryColor} onChangeText={setPrimaryColor} />
        <Text style={styles.label}>Color acento (botones)</Text>
        <TextInput style={styles.input} value={accentColor} onChangeText={setAccentColor} />
        <Text style={styles.label}>Email de soporte</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={supportEmail}
          onChangeText={setSupportEmail}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {ok ? <Text style={styles.okText}>{ok}</Text> : null}
        <Pressable
          style={[styles.btnPrimary, saving && { opacity: 0.7 }]}
          onPress={() => void save()}
          disabled={saving}
        >
          <Text style={styles.btnPrimaryText}>
            {saving ? "Guardando…" : "Guardar marca"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
