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
  deleteEmailTemplate,
  fetchEmailTemplates,
  saveEmailTemplate,
  toggleEmailTemplate,
  type EmailTemplateRow,
} from "@/lib/admin-api";
import { confirmDestructive } from "@/lib/confirm-alert";
import { useAppTheme } from "@/lib/useAppTheme";

const emptyForm = {
  name: "",
  subject: "",
  delayHours: "24",
  htmlBody: "<p>Hola {{name}}</p>",
};

export default function AdminEmailsScreen() {
  const { colors, styles } = useAppTheme();
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

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
        name: createForm.name.trim(),
        subject: createForm.subject.trim(),
        htmlBody: createForm.htmlBody,
        delayHours: Number.parseInt(createForm.delayHours, 10) || 0,
        active: true,
      });
      setCreateForm(emptyForm);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  function startEdit(t: EmailTemplateRow) {
    setEditingId(t.id);
    setEditForm({
      name: t.name,
      subject: t.subject,
      delayHours: String(t.delayHours),
      htmlBody: t.htmlBody,
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    try {
      await saveEmailTemplate({
        id: editingId,
        name: editForm.name.trim(),
        subject: editForm.subject.trim(),
        htmlBody: editForm.htmlBody,
        delayHours: Number.parseInt(editForm.delayHours, 10) || 0,
      });
      setEditingId(null);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  function removeTemplate(t: EmailTemplateRow) {
    confirmDestructive(
      "Eliminar plantilla",
      `¿Eliminar "${t.name}"?`,
      async () => {
        try {
          await deleteEmailTemplate(t.id);
          if (editingId === t.id) setEditingId(null);
          void load();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Error");
        }
      }
    );
  }

  function FormFields({
    form,
    onChange,
  }: {
    form: typeof emptyForm;
    onChange: (next: typeof emptyForm) => void;
  }) {
    return (
      <>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(v) => onChange({ ...form, name: v })}
        />
        <Text style={styles.label}>Asunto</Text>
        <TextInput
          style={styles.input}
          value={form.subject}
          onChangeText={(v) => onChange({ ...form, subject: v })}
        />
        <Text style={styles.label}>Horas después del evento</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={form.delayHours}
          onChangeText={(v) => onChange({ ...form, delayHours: v })}
        />
        <Text style={styles.label}>HTML</Text>
        <TextInput
          style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
          multiline
          value={form.htmlBody}
          onChangeText={(v) => onChange({ ...form, htmlBody: v })}
        />
      </>
    );
  }

  return (
    <ScrollView style={styles.screenPadded} keyboardShouldPersistTaps="handled">
      <View style={[styles.card, { marginBottom: 16 }]}>
        <Text style={styles.sectionLabel}>Nueva plantilla</Text>
        <FormFields form={createForm} onChange={setCreateForm} />
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
            style={[
              styles.rowCard,
              { borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
            ]}
          >
            {editingId === t.id ? (
              <>
                <Text style={styles.sectionLabel}>Editar plantilla</Text>
                <FormFields form={editForm} onChange={setEditForm} />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <Pressable
                    style={[styles.btnPrimary, { flex: 1, marginTop: 0 }]}
                    onPress={() => void saveEdit()}
                  >
                    <Text style={styles.btnPrimaryText}>Guardar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btnOutline, { marginTop: 0 }]}
                    onPress={() => setEditingId(null)}
                  >
                    <Text style={styles.btnOutlineText}>Cancelar</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.rowTitle}>{t.name}</Text>
                <Text style={styles.rowMeta}>{t.subject}</Text>
                <Text style={styles.rowMeta}>
                  +{t.delayHours}h · {t.active ? "Activa" : "Pausada"}
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <Pressable style={styles.btnOutline} onPress={() => startEdit(t)}>
                    <Text style={styles.btnOutlineText}>Editar</Text>
                  </Pressable>
                  <Pressable
                    style={styles.btnOutline}
                    onPress={() => void toggleEmailTemplate(t.id).then(() => load())}
                  >
                    <Text style={styles.btnOutlineText}>
                      {t.active ? "Pausar" : "Activar"}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.btnDanger} onPress={() => removeTemplate(t)}>
                    <Text style={styles.btnDangerText}>Eliminar</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}
