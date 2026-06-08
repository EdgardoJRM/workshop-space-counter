import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchPendingPurchases,
  resolvePendingPurchase,
  type PendingPurchaseRow,
} from "@/lib/admin-api";
import {
  WORKSHOP_SLUGS,
  getWorkshopLabel,
  type WorkshopSlug,
} from "@/lib/workshops";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

export default function PendingPurchasesScreen() {
  const { colors, styles } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingPurchaseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<PendingPurchaseRow | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<WorkshopSlug>("duplica-ventas");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPendingPurchases();
      setPending(data.pending);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmResolve(row: PendingPurchaseRow, slug: WorkshopSlug) {
    setResolvingId(row.id);
    try {
      const result = await resolvePendingPurchase(row.id, slug);
      Alert.alert(
        result.duplicate ? "Ya registrado" : "Registro creado",
        result.duplicate
          ? "Este pedido ya tenía pase."
          : "Se envió el pase por email al asistente."
      );
      await load();
    } catch (e) {
      Alert.alert(
        "No se pudo registrar",
        e instanceof Error ? e.message : "Error desconocido"
      );
    } finally {
      setResolvingId(null);
      setPickerFor(null);
    }
  }

  function openPicker(row: PendingPurchaseRow) {
    setPickerFor(row);
    setSelectedSlug("duplica-ventas");
  }

  return (
    <ScrollView style={styles.screenPadded} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={[styles.subtitle, { marginBottom: 16 }]}>
        Compras de ClickFunnels sin código de taller en el funnel (vcanva, vdtv, etc.).
        Elige el evento y confirma el registro.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : pending.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>No hay compras pendientes.</Text>
        </View>
      ) : (
        pending.map((row) => (
          <View key={row.id} style={[styles.card, { marginBottom: 12 }]}>
            <Text style={[styles.sectionLabel, { color: colors.accent }]}>
              {row.funnelLabel ?? "Funnel desconocido"}
            </Text>
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text, marginTop: 4 }}>
              {row.name?.trim() || row.email}
            </Text>
            <Text style={[styles.subtitle, { marginTop: 4 }]}>{row.email}</Text>
            {row.phone ? (
              <Text style={[styles.subtitle, { marginTop: 2 }]}>{row.phone}</Text>
            ) : null}
            <Text style={[styles.subtitle, { marginTop: 8, fontSize: 12 }]}>
              Orden {row.externalOrderId}
            </Text>
            <Pressable
              style={[
                styles.btnPrimary,
                { marginTop: 14, opacity: resolvingId === row.id ? 0.6 : 1 },
              ]}
              onPress={() => openPicker(row)}
              disabled={resolvingId === row.id}
            >
              <Text style={styles.btnPrimaryText}>
                {resolvingId === row.id ? "Registrando…" : "Elegir taller y registrar"}
              </Text>
            </Pressable>
          </View>
        ))
      )}

      <Modal visible={pickerFor !== null} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
          onPress={() => setPickerFor(null)}
        >
          <Pressable
            style={{
              backgroundColor: webBrand.white,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 20,
              maxHeight: "70%",
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.title, { fontSize: 18, marginBottom: 8 }]}>
              ¿A qué taller va?
            </Text>
            {pickerFor ? (
              <Text style={[styles.subtitle, { marginBottom: 16 }]}>
                {pickerFor.name ?? pickerFor.email} — {pickerFor.funnelLabel ?? "CF"}
              </Text>
            ) : null}
            <ScrollView style={{ maxHeight: 220 }}>
              {WORKSHOP_SLUGS.map((slug) => (
                <Pressable
                  key={slug}
                  onPress={() => setSelectedSlug(slug)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Ionicons
                    name={selectedSlug === slug ? "radio-button-on" : "radio-button-off"}
                    size={22}
                    color={selectedSlug === slug ? colors.primary : colors.textSubtle}
                  />
                  <Text
                    style={{
                      marginLeft: 10,
                      fontSize: 16,
                      fontWeight: selectedSlug === slug ? "700" : "400",
                      color: colors.text,
                    }}
                  >
                    {getWorkshopLabel(slug)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.btnPrimary, { marginTop: 16 }]}
              onPress={() => pickerFor && void confirmResolve(pickerFor, selectedSlug)}
            >
              <Text style={styles.btnPrimaryText}>Confirmar registro</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
