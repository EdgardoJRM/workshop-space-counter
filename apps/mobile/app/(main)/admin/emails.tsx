import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { IconCircle } from "@/components/IconCircle";
import { InfoBanner } from "@/components/InfoBanner";
import { SectionCard } from "@/components/SectionCard";
import {
  deleteEmailTemplate,
  fetchEmailTemplates,
  saveEmailTemplate,
  toggleEmailTemplate,
  type EmailLogRow,
  type EmailTemplateAnchor,
  type EmailTemplateRow,
} from "@/lib/admin-api";
import { confirmDestructive } from "@/lib/confirm-alert";
import {
  DEFAULT_EMAIL_BODY_PLAIN,
  emailHtmlToPlainText,
  plainTextToEmailHtml,
} from "@/lib/email-template-text";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

const TEMPLATE_VARS = "{{name}}, {{email}}, {{workshop}}, {{eventDate}}, {{venue}}";

const emptyForm = {
  name: "",
  subject: "",
  delayHours: "0",
  anchor: "checkin" as EmailTemplateAnchor,
  body: DEFAULT_EMAIL_BODY_PLAIN,
  active: true,
};

type FormState = typeof emptyForm;

function formatDelay(hours: number, anchor: EmailTemplateAnchor = "event_start"): string {
  const reference = anchor === "checkin" ? "del check-in" : "del evento";
  if (hours === 0) {
    return anchor === "checkin" ? "Al momento del check-in" : "Al momento del evento";
  }
  if (hours < 24) return `${hours}h después ${reference}`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  if (rem === 0) return `${days} día${days > 1 ? "s" : ""} después ${reference}`;
  return `${days}d ${rem}h después ${reference}`;
}

function formatSentAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-PR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function validateForm(form: FormState): string | null {
  if (!form.name.trim()) return "Indica el nombre de la plantilla";
  if (!form.subject.trim()) return "Indica el asunto del email";
  if (!form.body.trim()) return "Indica el mensaje del correo";
  const h = Number.parseInt(form.delayHours, 10);
  if (!Number.isInteger(h) || h < 0) return "El delay debe ser un entero ≥ 0";
  return null;
}

function TemplateCard({
  accentColor,
  children,
}: {
  accentColor: string;
  children: ReactNode;
}) {
  const { colors, styles } = useAppTheme();

  return (
    <View
      style={[
        styles.rowCard,
        {
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 12,
          flexDirection: "row",
          overflow: "hidden",
          paddingLeft: 0,
        },
      ]}
    >
      <View style={{ width: 4, backgroundColor: accentColor }} />
      <View style={{ flex: 1, padding: 16 }}>{children}</View>
    </View>
  );
}

function FormFields({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (next: FormState) => void;
}) {
  const { colors, styles } = useAppTheme();

  return (
    <>
      <Text style={styles.fieldLabel}>Nombre de la plantilla</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej. Gracias post-evento"
        placeholderTextColor={colors.textSubtle}
        value={form.name}
        onChangeText={(v) => onChange({ ...form, name: v })}
      />
      <Text style={styles.fieldLabel}>Asunto del email</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej. ¡Gracias por asistir!"
        placeholderTextColor={colors.textSubtle}
        value={form.subject}
        onChangeText={(v) => onChange({ ...form, subject: v })}
      />
      <Text style={styles.fieldLabel}>Referencia del tiempo</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        {(
          [
            ["checkin", "Check-in (QR)"],
            ["event_start", "Inicio evento"],
          ] as const
        ).map(([value, label]) => {
          const selected = form.anchor === value;
          return (
            <Pressable
              key={value}
              onPress={() => onChange({ ...form, anchor: value })}
              style={[
                styles.input,
                {
                  flex: 1,
                  paddingVertical: 10,
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: selected ? `${colors.accent}18` : colors.surface,
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? colors.accent : colors.text,
                  textAlign: "center",
                  fontWeight: selected ? "700" : "500",
                  fontSize: 13,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.fieldLabel}>Delay (horas después)</Text>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TextInput
          style={[styles.input, { width: 72, textAlign: "center" }]}
          value={form.delayHours}
          onChangeText={(v) => onChange({ ...form, delayHours: v.replace(/\D/g, "") || "0" })}
          keyboardType="number-pad"
        />
        <View style={[styles.input, { flex: 1, justifyContent: "center" }]}>
          <Text style={{ color: colors.text }}>horas después de la referencia</Text>
        </View>
      </View>
      <Text style={[styles.subtitle, { marginTop: 4 }]}>
        {formatDelay(Number.parseInt(form.delayHours, 10) || 0, form.anchor)}
        {form.anchor === "checkin" && Number.parseInt(form.delayHours, 10) === 0
          ? " — se envía al escanear."
          : ""}
      </Text>
      <Text style={styles.fieldLabel}>Mensaje del correo</Text>
      <Text style={[styles.subtitle, { marginBottom: 8, marginTop: -4 }]}>
        Escribe normal, como un email. Variables: {TEMPLATE_VARS}. Párrafos separados con línea en blanco.
      </Text>
      <TextInput
        style={[styles.input, { minHeight: 160, textAlignVertical: "top", fontSize: 15, lineHeight: 22 }]}
        multiline
        value={form.body}
        onChangeText={(v) => onChange({ ...form, body: v })}
        placeholder={"Hola {{name}},\n\nGracias por asistir..."}
        placeholderTextColor={colors.textSubtle}
        autoCapitalize="sentences"
      />
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.fieldLabel, { marginTop: 0 }]}>Plantilla activa</Text>
          <Text style={styles.subtitle}>El cron enviará emails solo si está activa.</Text>
        </View>
        <Switch
          value={form.active}
          onValueChange={(active) => onChange({ ...form, active })}
          trackColor={{ true: colors.accent }}
        />
      </View>
    </>
  );
}

export default function AdminEmailsScreen() {
  const { colors, styles } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [logs, setLogs] = useState<EmailLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(true);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEmailTemplates();
      setTemplates(data.templates);
      setLogs(data.logs ?? []);
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
    const err = validateForm(createForm);
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await saveEmailTemplate({
        name: createForm.name.trim(),
        subject: createForm.subject.trim(),
        htmlBody: plainTextToEmailHtml(createForm.body),
        delayHours: Number.parseInt(createForm.delayHours, 10) || 0,
        anchor: createForm.anchor,
        active: createForm.active,
      });
      setCreateForm(emptyForm);
      setOk("Plantilla creada");
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(t: EmailTemplateRow) {
    setEditingId(t.id);
    setShowCreate(false);
    setEditForm({
      name: t.name,
      subject: t.subject,
      delayHours: String(t.delayHours),
      anchor: t.anchor ?? "event_start",
      body: emailHtmlToPlainText(t.htmlBody),
      active: t.active,
    });
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
  }

  function cancelEdit() {
    setEditingId(null);
    setShowCreate(true);
  }

  async function saveEdit() {
    if (!editingId) return;
    const err = validateForm(editForm);
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await saveEmailTemplate({
        id: editingId,
        name: editForm.name.trim(),
        subject: editForm.subject.trim(),
        htmlBody: plainTextToEmailHtml(editForm.body),
        delayHours: Number.parseInt(editForm.delayHours, 10) || 0,
        anchor: editForm.anchor,
        active: editForm.active,
      });
      setEditingId(null);
      setShowCreate(true);
      setOk("Cambios guardados");
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  function removeTemplate(t: EmailTemplateRow) {
    confirmDestructive("Eliminar plantilla", `¿Eliminar "${t.name}"?`, async () => {
      try {
        await deleteEmailTemplate(t.id);
        if (editingId === t.id) cancelEdit();
        void load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    });
  }

  const sentCount = logs.filter((l) => l.status === "sent").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.screenPadded}
        keyboardShouldPersistTaps="handled"
      >
        <InfoBanner>
          Variables: {TEMPLATE_VARS}. Elige si el delay es desde el check-in (escaneo) o desde el
          inicio del evento. Con check-in y 0h, el email sale al escanear.
        </InfoBanner>

        {showCreate && !editingId ? (
          <SectionCard icon="mail-outline" title="Nueva plantilla">
            <FormFields form={createForm} onChange={setCreateForm} />
            <Pressable
              style={[styles.btnPrimary, styles.btnWithIcon, saving && { opacity: 0.7 }]}
              onPress={() => void create()}
              disabled={saving}
            >
              <Ionicons name="add" size={20} color={colors.onAccent} />
              <Text style={styles.btnPrimaryText}>
                {saving ? "Guardando…" : "Crear plantilla"}
              </Text>
            </Pressable>
          </SectionCard>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {ok ? <Text style={styles.okText}>{ok}</Text> : null}

        {!showCreate && !editingId && templates.length > 0 ? (
          <Pressable
            style={[styles.btnOutline, { marginBottom: 12 }]}
            onPress={() => setShowCreate(true)}
          >
            <Text style={styles.btnOutlineText}>+ Nueva plantilla</Text>
          </Pressable>
        ) : null}

        <Text style={[styles.title, { fontSize: 17, marginVertical: 12 }]}>
          Plantillas configuradas · {templates.length}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : templates.length === 0 ? (
          <Text style={styles.subtitle}>Sin plantillas aún.</Text>
        ) : (
          templates.map((t) => (
            <TemplateCard
              key={t.id}
              accentColor={
                editingId === t.id
                  ? colors.accent
                  : t.active
                    ? webBrand.success
                    : colors.textSubtle
              }
            >
              {editingId === t.id ? (
                <>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <IconCircle name="mail-outline" variant="gold" size={36} />
                    <Text style={styles.rowTitle}>Editar plantilla</Text>
                    <StatusBadgeInline label="En edición" variant="warning" />
                  </View>
                  <FormFields form={editForm} onChange={setEditForm} />
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                    <Pressable
                      style={[
                        styles.btnPrimary,
                        { flex: 1, marginTop: 0 },
                        styles.btnWithIcon,
                        saving && { opacity: 0.7 },
                      ]}
                      onPress={() => void saveEdit()}
                      disabled={saving}
                    >
                      <Ionicons name="save-outline" size={18} color={colors.onAccent} />
                      <Text style={styles.btnPrimaryText}>
                        {saving ? "Guardando…" : "Guardar cambios"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.btnOutline, { marginTop: 0, flex: 1 }]}
                      onPress={cancelEdit}
                    >
                      <Text style={styles.btnOutlineText}>Cancelar</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <IconCircle
                      name="mail-outline"
                      variant={t.active ? "green" : "gold"}
                      size={36}
                    />
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <Text style={styles.rowTitle}>{t.name}</Text>
                        <StatusBadgeInline
                          label={t.active ? "Activa" : "Pausada"}
                          variant={t.active ? "success" : "muted"}
                        />
                      </View>
                      <Text style={styles.rowMeta}>
                        {formatDelay(t.delayHours, t.anchor ?? "event_start")}
                      </Text>
                      <Text style={styles.rowMeta}>{t.subject}</Text>
                      <Text style={[styles.rowMeta, { marginTop: 6 }]} numberOfLines={3}>
                        {emailHtmlToPlainText(t.htmlBody)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                    <OutlineBtn
                      label="Editar"
                      icon="pencil-outline"
                      color={colors.link}
                      onPress={() => startEdit(t)}
                    />
                    <OutlineBtn
                      label={t.active ? "Pausar" : "Activar"}
                      icon={t.active ? "pause-outline" : "play-outline"}
                      color={colors.accent}
                      onPress={() => void toggleEmailTemplate(t.id).then(() => load())}
                    />
                    <OutlineBtn
                      label="Eliminar"
                      icon="trash-outline"
                      color="#dc2626"
                      onPress={() => removeTemplate(t)}
                    />
                  </View>
                </>
              )}
            </TemplateCard>
          ))
        )}

        <View style={{ marginTop: 20 }}>
          <Text style={[styles.title, { fontSize: 17 }]}>Últimos envíos</Text>
          <Text style={[styles.subtitle, { marginTop: 4, marginBottom: 12 }]}>
            {sentCount} enviados · {failedCount} fallidos (últimos 50)
          </Text>
          {logs.length === 0 ? (
            <Text style={styles.subtitle}>Aún no hay envíos automáticos.</Text>
          ) : (
            logs.map((l) => (
              <View
                key={l.id}
                style={[
                  styles.cardFlat,
                  { marginBottom: 8, backgroundColor: webBrand.off },
                ]}
              >
                <Text style={styles.rowTitle}>{l.templateName}</Text>
                <Text style={styles.rowMeta}>
                  {l.attendeeName ?? l.attendeeEmail} · {l.workshopLabel}
                </Text>
                <Text style={styles.rowMeta}>{formatSentAt(l.sentAt)}</Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: l.status === "sent" ? colors.success : colors.error,
                    marginTop: 4,
                  }}
                >
                  {l.status}
                  {l.error ? ` — ${l.error}` : ""}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StatusBadgeInline({
  label,
  variant,
}: {
  label: string;
  variant: "success" | "warning" | "muted";
}) {
  const bg =
    variant === "success"
      ? "rgba(45, 106, 79, 0.14)"
      : variant === "warning"
        ? "rgba(255, 201, 7, 0.28)"
        : "rgba(165, 165, 165, 0.2)";
  const color =
    variant === "success" ? "#2d6a4f" : variant === "warning" ? "#b45309" : "#4c5c68";

  return (
    <View
      style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: bg }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>{label}</Text>
    </View>
  );
}

function OutlineBtn({
  label,
  icon,
  color,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: color,
      }}
    >
      <Ionicons name={icon} size={14} color={color} />
      <Text style={{ fontSize: 12, fontWeight: "600", color }}>{label}</Text>
    </Pressable>
  );
}
