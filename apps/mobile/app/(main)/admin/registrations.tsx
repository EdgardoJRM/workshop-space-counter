import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SectionCard } from "@/components/SectionCard";
import { WorkshopPicker } from "@/components/WorkshopPicker";
import {
  adminReprintLabel,
  cancelRegistration,
  createManualRegistration,
  fetchAdminRegistrations,
  importCsv,
  resendPassEmail,
  updateRegistration,
  type AdminRegistrationRow,
} from "@/lib/admin-api";
import { confirmDestructive } from "@/lib/confirm-alert";
import { useSession } from "@/lib/session-context";
import { useAppTheme } from "@/lib/useAppTheme";

export default function AdminRegistrationsScreen() {
  const { workshop } = useSession();
  const { colors, styles } = useAppTheme();
  const [rows, setRows] = useState<AdminRegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminRegistrations(workshop);
      setRows(data.registrations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [workshop]);

  useEffect(() => {
    void load();
  }, [load]);

  async function manualRegister() {
    if (!email.includes("@")) {
      setError("Email inválido");
      return;
    }
    setBusy("manual");
    try {
      await createManualRegistration({
        workshop,
        email: email.trim().toLowerCase(),
        name: name.trim() || undefined,
      });
      setEmail("");
      setName("");
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  async function doImport() {
    if (!csv.trim()) {
      setError("Pega el CSV");
      return;
    }
    setBusy("csv");
    try {
      const res = await importCsv(workshop, csv, true);
      setCsv("");
      setError(null);
      alert(`Creados: ${res.created} · Duplicados: ${res.duplicates} · Fallos: ${res.failed}`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  function startEdit(r: AdminRegistrationRow) {
    setEditingId(r.id);
    setEditName(r.attendeeName ?? "");
    setEditPhone(r.attendeePhone ?? "");
  }

  async function saveEdit(registrationId: string) {
    try {
      await updateRegistration(registrationId, {
        name: editName.trim() || undefined,
        phone: editPhone.trim(),
      });
      setEditingId(null);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  function cancelReg(r: AdminRegistrationRow) {
    if (r.status === "CANCELLED") return;
    confirmDestructive(
      "Cancelar registro",
      `¿Cancelar el registro de ${r.attendeeEmail}? El pase dejará de ser válido.`,
      async () => {
        try {
          await cancelRegistration(r.id);
          void load();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Error");
        }
      }
    );
  }

  return (
    <ScrollView style={styles.screenPadded} keyboardShouldPersistTaps="handled">
      <WorkshopPicker />

      <SectionCard icon="person-add-outline" title="Registro manual">
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Text style={styles.label}>Nombre</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
        <Pressable
          style={styles.btnPrimary}
          onPress={() => void manualRegister()}
          disabled={busy === "manual"}
        >
          <Text style={styles.btnPrimaryText}>
            {busy === "manual" ? "Guardando…" : "Registrar"}
          </Text>
        </Pressable>
      </SectionCard>

      <SectionCard icon="document-text-outline" title="Importar CSV">
        <TextInput
          style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
          multiline
          value={csv}
          onChangeText={setCsv}
          placeholder="email,nombre,teléfono..."
          placeholderTextColor={colors.textSubtle}
        />
        <Pressable
          style={[styles.btnOutline, { flexDirection: "row", gap: 8, justifyContent: "center" }]}
          onPress={() => void doImport()}
          disabled={busy === "csv"}
        >
          <Ionicons name="cloud-upload-outline" size={20} color={colors.link} />
          <Text style={[styles.btnOutlineText, { color: colors.link }]}>
            {busy === "csv" ? "Importando…" : "Importar"}
          </Text>
        </Pressable>
      </SectionCard>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        rows.map((r) => (
          <View
            key={r.id}
            style={[
              styles.rowCard,
              r.status === "CANCELLED" && { opacity: 0.55 },
              { borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
            ]}
          >
            {editingId === r.id ? (
              <>
                <Text style={styles.sectionLabel}>Editar registro</Text>
                <Text style={styles.label}>Nombre</Text>
                <TextInput style={styles.input} value={editName} onChangeText={setEditName} />
                <Text style={styles.label}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  value={editPhone}
                  onChangeText={setEditPhone}
                />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <Pressable
                    style={[styles.btnPrimary, { flex: 1, marginTop: 0 }]}
                    onPress={() => void saveEdit(r.id)}
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
                <Text style={styles.rowTitle}>{r.attendeeName ?? r.attendeeEmail}</Text>
                <Text style={styles.rowMeta}>{r.attendeeEmail}</Text>
                {r.attendeePhone ? (
                  <Text style={styles.rowMeta}>{r.attendeePhone}</Text>
                ) : null}
                <Text style={styles.rowMeta}>
                  {r.status === "CANCELLED"
                    ? "Cancelado"
                    : r.checkedIn
                      ? "✓ Check-in"
                      : "Pendiente"}
                  {r.printStatus ? ` · ${r.printStatus}` : ""}
                </Text>
                {r.status !== "CANCELLED" ? (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <Pressable style={styles.btnOutline} onPress={() => startEdit(r)}>
                      <Text style={styles.btnOutlineText}>Editar</Text>
                    </Pressable>
                    <Pressable
                      style={styles.btnOutline}
                      onPress={() =>
                        void resendPassEmail(r.id)
                          .then(() => load())
                          .catch((e) =>
                            setError(e instanceof Error ? e.message : "Error")
                          )
                      }
                    >
                      <Text style={styles.btnOutlineText}>Reenviar pase</Text>
                    </Pressable>
                    <Pressable
                      style={styles.btnSecondary}
                      onPress={() =>
                        void adminReprintLabel(r.id)
                          .then(() => load())
                          .catch((e) =>
                            setError(e instanceof Error ? e.message : "Error")
                          )
                      }
                    >
                      <Text style={styles.btnSecondaryText}>Label</Text>
                    </Pressable>
                    <Pressable style={styles.btnDanger} onPress={() => cancelReg(r)}>
                      <Text style={styles.btnDangerText}>Cancelar</Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}
