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
import { FieldInput } from "@/components/FieldInput";
import { SearchField } from "@/components/SearchField";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkshopDropdown } from "@/components/WorkshopDropdown";
import {
  adminReprintLabel,
  cancelRegistration,
  createManualRegistration,
  fetchAdminDates,
  fetchAdminRegistrations,
  importCsv,
  resendPassEmail,
  updateRegistration,
  type AdminDateRow,
  type AdminRegistrationRow,
} from "@/lib/admin-api";
import { confirmDestructive } from "@/lib/confirm-alert";
import { useSession } from "@/lib/session-context";
import { useAppTheme } from "@/lib/useAppTheme";

function initials(name: string, email: string): string {
  const n = name.trim();
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function regStatusVariant(
  r: AdminRegistrationRow
): "gold" | "muted" | "success" {
  if (r.status === "CANCELLED") return "muted";
  if (r.checkedIn) return "success";
  return "gold";
}

function regStatusLabel(r: AdminRegistrationRow): string {
  if (r.status === "CANCELLED") return "Cancelado";
  if (r.checkedIn) return "Check-in";
  return "Pendiente";
}

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-PR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminRegistrationsScreen() {
  const { workshop } = useSession();
  const { colors, styles } = useAppTheme();
  const [rows, setRows] = useState<AdminRegistrationRow[]>([]);
  const [filtered, setFiltered] = useState<AdminRegistrationRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dates, setDates] = useState<AdminDateRow[]>([]);
  const [workshopDateId, setWorkshopDateId] = useState("");
  const [loadingDates, setLoadingDates] = useState(true);
  const [sendPassEmail, setSendPassEmail] = useState(true);
  const [csv, setCsv] = useState(
    "email,nombre\nmaria@ejemplo.com,María Rodríguez\njuan@ejemplo.com,Juan Pérez"
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
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

  useEffect(() => {
    void (async () => {
      setLoadingDates(true);
      try {
        const data = await fetchAdminDates(workshop);
        setDates(data.dates);
        const active = data.dates.find((d) => d.isActive) ?? data.dates[0];
        setWorkshopDateId(active?.id ?? "");
      } catch (e) {
        setDates([]);
        setWorkshopDateId("");
        setError(e instanceof Error ? e.message : "No se pudieron cargar las fechas");
      } finally {
        setLoadingDates(false);
      }
    })();
  }, [workshop]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFiltered(rows);
      return;
    }
    setFiltered(
      rows.filter(
        (r) =>
          r.attendeeEmail.toLowerCase().includes(q) ||
          (r.attendeeName ?? "").toLowerCase().includes(q)
      )
    );
  }, [rows, search]);

  async function manualRegister() {
    setError(null);
    setOk(null);
    if (!email.includes("@")) {
      setError("Email inválido");
      return;
    }
    if (!workshopDateId) {
      setError("No hay fecha del evento. Créala en Admin → Fechas y márcala como activa.");
      return;
    }
    setBusy("manual");
    try {
      const res = await createManualRegistration({
        workshop,
        email: email.trim().toLowerCase(),
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        workshopDateId,
        sendPassEmail,
      });
      setEmail("");
      setName("");
      setPhone("");
      setOk(
        res.duplicate
          ? "Esa persona ya estaba registrada en esta fecha."
          : sendPassEmail
            ? "Registrado y pase enviado por email."
            : "Registrado correctamente."
      );
      void load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      if (msg.includes("fecha activa") || msg.includes("NO_DATE")) {
        setError("No hay fecha activa para este taller. Ve a Admin → Fechas.");
      } else if (msg.includes("cupos") || msg.includes("SOLD_OUT")) {
        setError("No hay cupos disponibles en esa fecha.");
      } else {
        setError(msg);
      }
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
      setCsv("email,nombre");
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
    setEditEmail(r.attendeeEmail);
    setEditPhone(r.attendeePhone ?? "");
  }

  async function saveEdit(registrationId: string) {
    const nextEmail = editEmail.trim().toLowerCase();
    if (!nextEmail.includes("@")) {
      setError("Email inválido");
      return;
    }
    try {
      await updateRegistration(registrationId, {
        name: editName.trim() || undefined,
        email: nextEmail,
        phone: editPhone.trim(),
      });
      setEditingId(null);
      setError(null);
      setOk("Registro actualizado.");
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  function cancelReg(r: AdminRegistrationRow) {
    if (r.status === "CANCELLED") return;
    confirmDestructive(
      "Cancelar registro",
      `¿Cancelar el registro de ${r.attendeeEmail}?`,
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

  function outlineAction(
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    color: string,
    onPress: () => void
  ) {
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

  return (
    <ScrollView style={styles.screenPadded} keyboardShouldPersistTaps="handled">
      <WorkshopDropdown />

      <SectionCard icon="person-add-outline" title="Registro manual">
        <Text style={styles.label}>Fecha del evento</Text>
        {loadingDates ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 8 }} />
        ) : dates.length === 0 ? (
          <Text style={styles.errorText}>
            Sin fechas para este taller. Créalas en Admin → Fechas.
          </Text>
        ) : (
          <View style={{ gap: 8, marginBottom: 12 }}>
            {dates.map((d) => {
              const selected = d.id === workshopDateId;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setWorkshopDateId(d.id)}
                  style={[
                    styles.rowCard,
                    {
                      borderWidth: 2,
                      borderColor: selected ? colors.accent : colors.border,
                      marginBottom: 0,
                      padding: 12,
                    },
                  ]}
                >
                  <Text style={[styles.rowTitle, { fontSize: 14 }]}>{d.title}</Text>
                  <Text style={styles.rowMeta}>{formatEventDate(d.startsAt)}</Text>
                  {d.isActive ? (
                    <Text style={[styles.rowMeta, { color: colors.success, marginTop: 4 }]}>
                      Fecha activa
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

        <FieldInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="ejemplo@correo.com"
          leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textSubtle} />}
        />
        <FieldInput
          label="Nombre completo"
          value={name}
          onChangeText={setName}
          placeholder="Nombre del asistente"
          leftIcon={<Ionicons name="person-outline" size={18} color={colors.textSubtle} />}
        />
        <FieldInput
          label="Teléfono (opcional)"
          value={phone}
          onChangeText={setPhone}
          placeholder="7875551234"
          keyboardType="phone-pad"
          leftIcon={<Ionicons name="call-outline" size={18} color={colors.textSubtle} />}
        />

        <Pressable
          onPress={() => setSendPassEmail((v) => !v)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}
        >
          <Ionicons
            name={sendPassEmail ? "checkbox" : "square-outline"}
            size={22}
            color={sendPassEmail ? colors.accent : colors.textSubtle}
          />
          <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>
            Enviar pase por email
          </Text>
        </Pressable>

        {ok ? <Text style={styles.okText}>{ok}</Text> : null}

        <Pressable
          style={[styles.btnPrimary, styles.btnWithIcon]}
          onPress={() => void manualRegister()}
          disabled={busy === "manual" || loadingDates || !workshopDateId}
        >
          <Ionicons name="person-add-outline" size={20} color={colors.onAccent} />
          <Text style={styles.btnPrimaryText}>
            {busy === "manual" ? "Guardando…" : "Registrar"}
          </Text>
        </Pressable>
      </SectionCard>

      <SectionCard icon="document-text-outline" title="Importar CSV">
        <Text style={[styles.subtitle, { marginBottom: 12 }]}>
          Pega el contenido de tu archivo CSV (email,nombre).
        </Text>
        <TextInput
          style={[styles.input, { minHeight: 100, textAlignVertical: "top", fontSize: 13 }]}
          multiline
          value={csv}
          onChangeText={setCsv}
          placeholderTextColor={colors.textSubtle}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSubtle} />
          <Text style={styles.subtitle}>Encabezados requeridos: email,nombre</Text>
        </View>
        <Pressable
          style={{
            marginTop: 16,
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 10,
            borderWidth: 1.5,
            borderColor: colors.link,
          }}
          onPress={() => void doImport()}
          disabled={busy === "csv"}
        >
          <Ionicons name="cloud-upload-outline" size={20} color={colors.link} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.link }}>
            {busy === "csv" ? "Importando…" : "Importar"}
          </Text>
        </Pressable>
      </SectionCard>

      <Text style={[styles.title, { fontSize: 17, marginBottom: 12 }]}>Registros recientes</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre o email…"
            style={{ marginBottom: 0 }}
          />
        </View>
        <Pressable
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            height: 44,
            marginTop: 0,
          }}
        >
          <Ionicons name="funnel-outline" size={16} color={colors.text} />
          <Text style={{ fontSize: 13, fontWeight: "600" }}>Filtros</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textSubtle} />
        </Pressable>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        filtered.map((r) => (
          <View
            key={r.id}
            style={[
              styles.rowCard,
              r.status === "CANCELLED" && { opacity: 0.65 },
              { borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
            ]}
          >
            {editingId === r.id ? (
              <>
                <Text style={styles.sectionLabel}>Editar registro</Text>
                <FieldInput
                  label="Email"
                  value={editEmail}
                  onChangeText={setEditEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="ejemplo@correo.com"
                  leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textSubtle} />}
                />
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
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor:
                        r.status === "CANCELLED"
                          ? "rgba(165, 165, 165, 0.25)"
                          : "rgba(255, 201, 7, 0.35)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        color: r.status === "CANCELLED" ? colors.textSubtle : "#b45309",
                      }}
                    >
                      {initials(r.attendeeName ?? "", r.attendeeEmail)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={styles.rowTitle}>
                        {r.attendeeName ?? r.attendeeEmail}
                      </Text>
                      <Ionicons name="ellipsis-vertical" size={18} color={colors.textSubtle} />
                    </View>
                    <Text style={styles.rowMeta}>{r.attendeeEmail}</Text>
                    <Text style={[styles.rowMeta, { fontSize: 12 }]}>
                      Registrado:{" "}
                      {new Date(r.registeredAt).toLocaleString("es-PR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </Text>
                    <View style={{ marginTop: 8 }}>
                      <StatusBadge label={regStatusLabel(r)} variant={regStatusVariant(r)} />
                    </View>
                  </View>
                </View>
                {r.status !== "CANCELLED" ? (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      marginTop: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    {outlineAction("Editar", "pencil-outline", colors.link, () => startEdit(r))}
                    {outlineAction("Reenviar pase", "paper-plane-outline", colors.link, () =>
                      void resendPassEmail(r.id)
                        .then(() => load())
                        .catch((e) => setError(e instanceof Error ? e.message : "Error"))
                    )}
                    {outlineAction("Label", "print-outline", colors.link, () =>
                      void adminReprintLabel(r.id)
                        .then(() => load())
                        .catch((e) => setError(e instanceof Error ? e.message : "Error"))
                    )}
                    {outlineAction("Cancelar", "trash-outline", "#dc2626", () => cancelReg(r))}
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
