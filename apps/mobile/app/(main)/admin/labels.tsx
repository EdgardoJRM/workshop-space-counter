import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { InfoBanner } from "@/components/InfoBanner";
import { LabelPreview } from "@/components/LabelPreview";
import { SectionCard } from "@/components/SectionCard";
import { StepperInput } from "@/components/StepperInput";
import { WorkshopDropdown } from "@/components/WorkshopDropdown";
import { fetchLabelTemplate, saveLabelTemplate } from "@/lib/admin-api";
import { useSession } from "@/lib/session-context";
import { useAppTheme } from "@/lib/useAppTheme";

const MEDIA_SIZES = ["w62h29", "w62h100", "w29h90"];

export default function AdminLabelsScreen() {
  const { workshop } = useSession();
  const { colors, styles } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [fontLarge, setFontLarge] = useState("28");
  const [fontSmall, setFontSmall] = useState("10");
  const [mediaSize, setMediaSize] = useState("w62h29");
  const [showEmail, setShowEmail] = useState(true);
  const [showWorkshop, setShowWorkshop] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLabelTemplate(workshop);
      const t = data.template;
      setFontLarge(String(t?.fontLarge ?? 28));
      setFontSmall(String(t?.fontSmall ?? 10));
      setMediaSize(t?.mediaSize ?? "w62h29");
      setShowEmail(Boolean(t?.showEmail));
      setShowWorkshop(Boolean(t?.showWorkshop ?? true));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [workshop]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function stepFont(which: "large" | "small", delta: number) {
    const cur = which === "large" ? fontLarge : fontSmall;
    const n = Math.max(6, (Number.parseInt(cur, 10) || 0) + delta);
    if (which === "large") setFontLarge(String(n));
    else setFontSmall(String(n));
  }

  function cycleMedia() {
    const i = MEDIA_SIZES.indexOf(mediaSize);
    setMediaSize(MEDIA_SIZES[(i + 1) % MEDIA_SIZES.length] ?? "w62h29");
  }

  async function save() {
    setError(null);
    setOk(null);
    const large = Number.parseInt(fontLarge, 10);
    const small = Number.parseInt(fontSmall, 10);
    if (!Number.isFinite(large) || !Number.isFinite(small)) {
      setError("Tamaños de fuente inválidos");
      return;
    }
    try {
      await saveLabelTemplate(workshop, {
        fontLarge: large,
        fontSmall: small,
        mediaSize: mediaSize.trim() || "w62h29",
        showEmail,
        showWorkshop,
      });
      setOk("Plantilla guardada");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <ScrollView style={styles.screenPadded} keyboardShouldPersistTaps="handled">
      <WorkshopDropdown />

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <>
          <SectionCard>
            <LabelPreview
              showEmail={showEmail}
              showWorkshop={showWorkshop}
              fontLarge={Number.parseInt(fontLarge, 10) || 28}
              fontSmall={Number.parseInt(fontSmall, 10) || 10}
            />
          </SectionCard>

          <SectionCard title="Configuración de la plantilla">
            <Text style={styles.label}>Tamaño de fuente (nombre)</Text>
            <StepperInput
              value={fontLarge}
              onChangeText={setFontLarge}
              onDecrement={() => stepFont("large", -1)}
              onIncrement={() => stepFont("large", 1)}
            />

            <Text style={styles.label}>Tamaño de fuente (email)</Text>
            <StepperInput
              value={fontSmall}
              onChangeText={setFontSmall}
              onDecrement={() => stepFont("small", -1)}
              onIncrement={() => stepFont("small", 1)}
            />

            <Text style={styles.label}>Tamaño de fuente (taller)</Text>
            <Pressable
              onPress={cycleMedia}
              style={[
                styles.input,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                },
              ]}
            >
              <Text style={{ fontSize: 15, color: colors.text }}>{mediaSize}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSubtle} />
            </Pressable>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { marginTop: 0 }]}>Mostrar email</Text>
                <Text style={styles.subtitle}>Incluye el email del asistente en el label.</Text>
              </View>
              <Switch
                value={showEmail}
                onValueChange={setShowEmail}
                trackColor={{ true: colors.accent }}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { marginTop: 0 }]}>Mostrar taller</Text>
                <Text style={styles.subtitle}>Incluye el nombre del taller en el label.</Text>
              </View>
              <Switch
                value={showWorkshop}
                onValueChange={setShowWorkshop}
                trackColor={{ true: colors.accent }}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {ok ? <Text style={styles.okText}>{ok}</Text> : null}

            <Pressable
              style={[styles.btnPrimary, styles.btnWithIcon]}
              onPress={() => void save()}
            >
              <Ionicons name="save-outline" size={20} color={colors.onAccent} />
              <Text style={styles.btnPrimaryText}>Guardar plantilla</Text>
            </Pressable>
          </SectionCard>

          <InfoBanner>
            Plantilla para rollo 3×2 pulgadas. Asegúrate de usar etiquetas térmicas compatibles.
          </InfoBanner>
        </>
      )}
    </ScrollView>
  );
}
