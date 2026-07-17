import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MobileEvent, RegistrationRow } from "@/lib/types";
import { useAppTheme } from "@/lib/useAppTheme";

type Props = {
  visible: boolean;
  registration: RegistrationRow | null;
  events: MobileEvent[];
  currentEventId: string;
  busy: boolean;
  onClose: () => void;
  onSave: (input: {
    name: string;
    email: string;
    phone: string;
    workshopDateId: string;
  }) => void;
  onCancelRegistration: () => void;
  onCheckin: () => void;
  onReprint: () => void;
};

export function RegistrationDetailSheet({
  visible,
  registration,
  events,
  currentEventId,
  busy,
  onClose,
  onSave,
  onCancelRegistration,
  onCheckin,
  onReprint,
}: Props) {
  const { colors, styles } = useAppTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [workshopDateId, setWorkshopDateId] = useState(currentEventId);

  const workshopSlug = events.find((e) => e.workshopDateId === currentEventId)?.workshopSlug;
  const sameWorkshopEvents = events.filter((e) => e.workshopSlug === workshopSlug);

  useEffect(() => {
    if (!registration) return;
    setName(registration.name || "");
    setEmail(registration.email);
    setPhone(registration.phone ?? "");
    setWorkshopDateId(currentEventId);
  }, [registration, currentEventId, visible]);

  if (!registration) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
        <View
          style={{
            maxHeight: "88%",
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={styles.title}>Detalle</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Nombre</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholder="Nombre completo"
              placeholderTextColor={colors.textSubtle}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="email@ejemplo.com"
              placeholderTextColor={colors.textSubtle}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Teléfono</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="Opcional"
              placeholderTextColor={colors.textSubtle}
            />

            {sameWorkshopEvents.length > 1 ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.fieldLabel}>Fecha del taller</Text>
                {sameWorkshopEvents.map((ev) => (
                  <Pressable
                    key={ev.workshopDateId}
                    onPress={() => setWorkshopDateId(ev.workshopDateId)}
                    style={{
                      marginTop: 8,
                      padding: 12,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor:
                        workshopDateId === ev.workshopDateId ? colors.accent : colors.border,
                      backgroundColor:
                        workshopDateId === ev.workshopDateId
                          ? "rgba(40, 133, 210, 0.08)"
                          : colors.surface,
                    }}
                  >
                    <Text style={{ fontWeight: "600", color: colors.text }}>{ev.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={{ marginTop: 20, gap: 10 }}>
              <Pressable
                style={[styles.btnPrimary, busy && { opacity: 0.6 }]}
                disabled={busy}
                onPress={() =>
                  onSave({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    phone: phone.trim(),
                    workshopDateId,
                  })
                }
              >
                {busy ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <Text style={styles.btnPrimaryText}>Guardar cambios</Text>
                )}
              </Pressable>

              {!registration.checkedIn ? (
                <Pressable
                  style={[styles.btnSecondary, busy && { opacity: 0.6 }]}
                  disabled={busy}
                  onPress={onCheckin}
                >
                  <Text style={styles.btnSecondaryText}>Check-in manual</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.btnSecondary, busy && { opacity: 0.6 }]}
                  disabled={busy}
                  onPress={onReprint}
                >
                  <Text style={styles.btnSecondaryText}>Reimprimir label</Text>
                </Pressable>
              )}

              <Pressable
                style={{
                  paddingVertical: 14,
                  alignItems: "center",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(196, 71, 43, 0.35)",
                }}
                disabled={busy}
                onPress={onCancelRegistration}
              >
              <Text style={{ color: colors.error, fontWeight: "600" }}>Cancelar registro</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

type AddProps = {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; email: string; phone: string }) => void;
};

export function AddRegistrationModal({ visible, busy, onClose, onCreate }: AddProps) {
  const { colors, styles } = useAppTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!visible) return;
    setName("");
    setEmail("");
    setPhone("");
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={styles.title}>Añadir persona</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>Nombre</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Nombre completo"
            placeholderTextColor={colors.textSubtle}
          />

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="email@ejemplo.com"
            placeholderTextColor={colors.textSubtle}
          />

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Teléfono</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            keyboardType="phone-pad"
            placeholder="Opcional"
            placeholderTextColor={colors.textSubtle}
          />

          <Pressable
            style={[styles.btnPrimary, { marginTop: 20 }, busy && { opacity: 0.6 }]}
            disabled={busy}
            onPress={() =>
              onCreate({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
              })
            }
          >
            {busy ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.btnPrimaryText}>Crear registro</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
