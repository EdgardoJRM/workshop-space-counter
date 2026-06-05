import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  fetchEmailTemplates,
  saveEmailTemplate,
  toggleEmailTemplate,
  type EmailTemplateRow,
} from "@/lib/admin-api";
import { useAppTheme } from "@/lib/useAppTheme";

export default function AdminEmailsScreen() {
  const { colors, styles } = useAppTheme();
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [delayHours, setDelayHours] = useState("24");
  const [htmlBody, setHtmlBody] = useState("<p>Hola {{name}}</p>");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEmailTemplates();
      setTemplates(data.templates);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    try {
      await saveEmailTemplate({
        name: name.trim(),
        subject: subject.trim(),
        htmlBody,
        delayHours: Number.parseInt(delayHours, 10) || 0,
        active: true,
      });
      setName("");
      setSubject("");
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <ScrollView style={styles.screenPadded} keyboardShouldPersistTaps="handled">
      <View style={[styles.card, { marginBottom: 16 }]}>
        <Text style={styles.sectionLabel}>Nueva plantilla</Text>
        <Text style={styles.label}>Nombre</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
        <Text style={styles.label}>Asunto</Text>
        <TextInput style={styles.input} value={subject} onChangeText={setSubject} />
        <Text style={styles.label}>Horas después del evento</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={delayHours}
          onChangeText={setDelayHours}
        />
        <Text style={styles.label}>HTML</Text>
        <TextInput
          style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
          multiline
          value={htmlBody}
          onChangeText={setHtmlBody}
        />
        <Pressable style={styles.btnPrimary} onPress={() => void create()}>
          <Text style={styles.btnPrimaryText}>Crear plantilla</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        templates.map((t) => (
          <View
            key={t.id}
            style={[styles.rowCard, { borderWidth: 1, borderColor: colors.border }]}
          >
            <Text style={styles.rowTitle}>{t.name}</Text>
            <Text style={styles.rowMeta}>{t.subject}</Text>
            <Text style={styles.rowMeta}>
              +{t.delayHours}h · {t.active ? "Activa" : "Pausada"}
            </Text>
            <Pressable
              style={[styles.btnOutline, { marginTop: 10, alignSelf: "flex-start" }]}
              onPress={() => void toggleEmailTemplate(t.id).then(() => load())}
            >
              <Text style={styles.btnOutlineText}>
                {t.active ? "Pausar" : "Activar"}
              </Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}
