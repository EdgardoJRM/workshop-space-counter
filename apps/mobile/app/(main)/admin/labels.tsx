import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
} from "react-native";
import { WorkshopPicker } from "@/components/WorkshopPicker";
import { fetchLabelTemplate, saveLabelTemplate } from "@/lib/admin-api";
import { useSession } from "@/lib/session-context";
import { useAppTheme } from "@/lib/useAppTheme";

export default function AdminLabelsScreen() {
  const { workshop } = useSession();
  const { colors, styles } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [fontLarge, setFontLarge] = useState("72");
  const [fontSmall, setFontSmall] = useState("48");
  const [mediaSize, setMediaSize] = useState("3x2");
  const [showEmail, setShowEmail] = useState(false);
  const [showWorkshop, setShowWorkshop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLabelTemplate(workshop);
      setFontLarge(String(data.template.fontLarge));
      setFontSmall(String(data.template.fontSmall));
      setMediaSize(data.template.mediaSize);
      setShowEmail(data.template.showEmail);
      setShowWorkshop(data.template.showWorkshop);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [workshop]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setError(null);
    setOk(null);
    try {
      await saveLabelTemplate(workshop, {
        fontLarge: Number.parseInt(fontLarge, 10),
        fontSmall: Number.parseInt(fontSmall, 10),
        mediaSize: mediaSize.trim(),
        showEmail,
        showWorkshop,
      });
      setOk("Plantilla guardada");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <ScrollView style={styles.screenPadded}>
      <WorkshopPicker />
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>Fuente grande</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={fontLarge}
            onChangeText={setFontLarge}
          />
          <Text style={styles.label}>Fuente pequeña</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={fontSmall}
            onChangeText={setFontSmall}
          />
          <Text style={styles.label}>Tamaño media (ej. 3x2)</Text>
          <TextInput style={styles.input} value={mediaSize} onChangeText={setMediaSize} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
            <Text style={styles.label}>Mostrar email</Text>
            <Switch value={showEmail} onValueChange={setShowEmail} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={styles.label}>Mostrar taller</Text>
            <Switch value={showWorkshop} onValueChange={setShowWorkshop} />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {ok ? <Text style={styles.okText}>{ok}</Text> : null}
          <Pressable style={styles.btnPrimary} onPress={() => void save()}>
            <Text style={styles.btnPrimaryText}>Guardar plantilla</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
