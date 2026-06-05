import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { WorkshopPicker } from "@/components/WorkshopPicker";
import {
  adminReprintLabel,
  createManualRegistration,
  fetchAdminRegistrations,
  importCsv,
  resendPassEmail,
  type AdminRegistrationRow,
} from "@/lib/admin-api";
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

  return (
    <ScrollView style={styles.screenPadded} keyboardShouldPersistTaps="handled">
      <WorkshopPicker />

      <View style={[styles.card, { marginBottom: 16 }]}>
        <Text style={styles.sectionLabel}>Registro manual</Text>
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
      </View>

      <View style={[styles.card, { marginBottom: 16 }]}>
        <Text style={styles.sectionLabel}>Importar CSV</Text>
        <TextInput
          style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
          multiline
          value={csv}
          onChangeText={setCsv}
          placeholder="email,nombre,teléfono..."
          placeholderTextColor={colors.textSubtle}
        />
        <Pressable
          style={styles.btnSecondary}
          onPress={() => void doImport()}
          disabled={busy === "csv"}
        >
          <Text style={styles.btnSecondaryText}>
            {busy === "csv" ? "Importando…" : "Importar CSV"}
          </Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        rows.map((r) => (
          <View
            key={r.id}
            style={[styles.rowCard, { borderWidth: 1, borderColor: colors.border }]}
          >
            <Text style={styles.rowTitle}>{r.attendeeName ?? r.attendeeEmail}</Text>
            <Text style={styles.rowMeta}>{r.attendeeEmail}</Text>
            <Text style={styles.rowMeta}>
              {r.checkedIn ? "✓ Check-in" : "Pendiente"}
              {r.printStatus ? ` · ${r.printStatus}` : ""}
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <Pressable
                style={styles.btnOutline}
                onPress={() =>
                  void resendPassEmail(r.id).then(() => load()).catch((e) =>
                    setError(e instanceof Error ? e.message : "Error")
                  )
                }
              >
                <Text style={styles.btnOutlineText}>Reenviar pase</Text>
              </Pressable>
              <Pressable
                style={styles.btnSecondary}
                onPress={() =>
                  void adminReprintLabel(r.id).then(() => load()).catch((e) =>
                    setError(e instanceof Error ? e.message : "Error")
                  )
                }
              >
                <Text style={styles.btnSecondaryText}>Label</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
