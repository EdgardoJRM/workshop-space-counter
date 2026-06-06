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

/** Mismos defaults que lib/label-template.ts y print_core.py */
const DEFAULT_FONT_LARGE = 160;
const DEFAULT_FONT_SMALL = 80;
const DEFAULT_MEDIA = "3x2";

const FONT_LARGE_MIN = 40;
const FONT_LARGE_MAX = 240;
const FONT_LARGE_STEP = 10;

const FONT_SMALL_MIN = 20;
const FONT_SMALL_MAX = 120;
const FONT_SMALL_STEP = 5;

const MEDIA_OPTIONS = [
  { value: "3x2", label: "3×2″ — rollo estándar (CUPS)" },
  { value: "w62h29", label: "62×29 mm" },
  { value: "w62h100", label: "62×100 mm" },
  { value: "w29h90", label: "29×90 mm" },
] as const;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export default function AdminLabelsScreen() {
  const { workshop } = useSession();
  const { colors, styles } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [fontLarge, setFontLarge] = useState(String(DEFAULT_FONT_LARGE));
  const [fontSmall, setFontSmall] = useState(String(DEFAULT_FONT_SMALL));
  const [mediaSize, setMediaSize] = useState(DEFAULT_MEDIA);
  const [showEmail, setShowEmail] = useState(false);
  const [showWorkshop, setShowWorkshop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLabelTemplate(workshop);
      const t = data.template;
      setFontLarge(String(t?.fontLarge ?? DEFAULT_FONT_LARGE));
      setFontSmall(String(t?.fontSmall ?? DEFAULT_FONT_SMALL));
      setMediaSize(t?.mediaSize ?? DEFAULT_MEDIA);
      setShowEmail(Boolean(t?.showEmail));
      setShowWorkshop(Boolean(t?.showWorkshop));
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
    if (which === "large") {
      const n = clamp(
        (Number.parseInt(fontLarge, 10) || DEFAULT_FONT_LARGE) + delta * FONT_LARGE_STEP,
        FONT_LARGE_MIN,
        FONT_LARGE_MAX
      );
      setFontLarge(String(n));
    } else {
      const n = clamp(
        (Number.parseInt(fontSmall, 10) || DEFAULT_FONT_SMALL) + delta * FONT_SMALL_STEP,
        FONT_SMALL_MIN,
        FONT_SMALL_MAX
      );
      setFontSmall(String(n));
    }
  }

  function cycleMedia() {
    const i = MEDIA_OPTIONS.findIndex((o) => o.value === mediaSize);
    const next = MEDIA_OPTIONS[(i + 1) % MEDIA_OPTIONS.length];
    setMediaSize(next?.value ?? DEFAULT_MEDIA);
  }

  const mediaLabel =
    MEDIA_OPTIONS.find((o) => o.value === mediaSize)?.label ?? mediaSize;

  async function save() {
    setError(null);
    setOk(null);
    const large = Number.parseInt(fontLarge, 10);
    const small = Number.parseInt(fontSmall, 10);
    if (
      !Number.isInteger(large) ||
      large < FONT_LARGE_MIN ||
      large > FONT_LARGE_MAX
    ) {
      setError(`Fuente nombre: entero entre ${FONT_LARGE_MIN} y ${FONT_LARGE_MAX}`);
      return;
    }
    if (
      !Number.isInteger(small) ||
      small < FONT_SMALL_MIN ||
      small > FONT_SMALL_MAX
    ) {
      setError(`Fuente apellido: entero entre ${FONT_SMALL_MIN} y ${FONT_SMALL_MAX}`);
      return;
    }
    try {
      await saveLabelTemplate(workshop, {
        fontLarge: large,
        fontSmall: small,
        mediaSize: mediaSize.trim() || DEFAULT_MEDIA,
        showEmail,
        showWorkshop,
      });
      setOk("Plantilla guardada");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  const largeNum = Number.parseInt(fontLarge, 10) || DEFAULT_FONT_LARGE;
  const smallNum = Number.parseInt(fontSmall, 10) || DEFAULT_FONT_SMALL;

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
              fontLarge={largeNum}
              fontSmall={smallNum}
              mediaSize={mediaSize}
            />
          </SectionCard>

          <SectionCard title="Configuración de la plantilla">
            <Text style={styles.label}>Fuente nombre (px)</Text>
            <Text style={[styles.subtitle, { marginBottom: 8, marginTop: -4 }]}>
              Primera línea — primer nombre. Rango {FONT_LARGE_MIN}–{FONT_LARGE_MAX}.
            </Text>
            <StepperInput
              value={fontLarge}
              onChangeText={setFontLarge}
              onDecrement={() => stepFont("large", -1)}
              onIncrement={() => stepFont("large", 1)}
            />

            <Text style={styles.label}>Fuente apellido (px)</Text>
            <Text style={[styles.subtitle, { marginBottom: 8, marginTop: -4 }]}>
              Segunda línea — apellidos. Rango {FONT_SMALL_MIN}–{FONT_SMALL_MAX}.
            </Text>
            <StepperInput
              value={fontSmall}
              onChangeText={setFontSmall}
              onDecrement={() => stepFont("small", -1)}
              onIncrement={() => stepFont("small", 1)}
            />

            <Text style={styles.label}>Tamaño papel CUPS</Text>
            <Text style={[styles.subtitle, { marginBottom: 8, marginTop: -4 }]}>
              Debe coincidir con el rollo en la Mac impresora (Impresora Auto).
            </Text>
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
              <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>{mediaLabel}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSubtle} />
            </Pressable>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { marginTop: 0 }]}>Mostrar email</Text>
                <Text style={styles.subtitle}>Línea extra bajo el nombre (tamaño reducido).</Text>
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
                <Text style={styles.subtitle}>Nombre del taller en el label.</Text>
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
            Igual que el admin web: nombre 160px y apellido 80px por defecto sobre lienzo
            900×600 (3×2″). La Mac impresora usa el tamaño CUPS seleccionado arriba.
          </InfoBanner>
        </>
      )}
    </ScrollView>
  );
}
