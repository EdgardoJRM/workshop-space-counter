import { Text, useWindowDimensions, View } from "react-native";
import { useSession } from "@/lib/session-context";
import { getWorkshopLabel } from "@/lib/workshops";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

/** Canvas de impresión en print_core.py (300 DPI → 3×2″). */
const PRINT_WIDTH = 900;
const PRINT_HEIGHT = 600;

function splitNameForLabel(fullName: string): { first: string; last: string } {
  const cleaned = fullName.replace(/\*/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.slice(1).join(" ");
  const showStar = fullName.includes("*");
  return {
    first: showStar && first ? `${first} *` : first,
    last,
  };
}

export function LabelPreview({
  sampleName = "María Rodríguez",
  email = "maria@ejemplo.com",
  showEmail,
  showWorkshop,
  fontLarge = 160,
  fontSmall = 80,
  mediaSize = "3x2",
}: {
  sampleName?: string;
  email?: string;
  showEmail: boolean;
  showWorkshop: boolean;
  fontLarge?: number;
  fontSmall?: number;
  mediaSize?: string;
}) {
  const { workshop } = useSession();
  const { colors } = useAppTheme();
  const { width: screenW } = useWindowDimensions();

  const labelWidth = Math.min(screenW - 64, 340);
  const aspect = mediaSize === "3x2" ? PRINT_HEIGHT / PRINT_WIDTH : 29 / 62;
  const labelHeight = labelWidth * aspect;
  const scale = labelWidth / PRINT_WIDTH;

  const { first, last } = splitNameForLabel(sampleName);
  const extraFont = Math.max(40, Math.floor(fontSmall / 2)) * scale;

  const mediaLabel =
    mediaSize === "3x2"
      ? "3×2″"
      : mediaSize === "w62h29"
        ? "62×29 mm"
        : mediaSize;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: colors.text,
          marginBottom: 10,
        }}
      >
        Vista previa ({mediaLabel})
      </Text>
      <View
        style={{
          width: labelWidth,
          height: labelHeight,
          alignSelf: "center",
          backgroundColor: webBrand.white,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 12 * scale,
          paddingVertical: 16 * scale,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {first ? (
          <Text
            style={{
              fontSize: fontLarge * scale,
              fontWeight: "800",
              color: colors.text,
              textAlign: "center",
            }}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {first}
          </Text>
        ) : null}
        {last ? (
          <Text
            style={{
              fontSize: fontSmall * scale,
              fontWeight: "600",
              color: colors.text,
              textAlign: "center",
              marginTop: 10 * scale,
            }}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {last}
          </Text>
        ) : null}
        {showWorkshop ? (
          <Text
            style={{
              fontSize: extraFont,
              color: colors.textMuted,
              textAlign: "center",
              marginTop: 14 * scale,
            }}
            numberOfLines={1}
          >
            {getWorkshopLabel(workshop)}
          </Text>
        ) : null}
        {showEmail ? (
          <Text
            style={{
              fontSize: extraFont,
              color: colors.textMuted,
              textAlign: "center",
              marginTop: showWorkshop ? 6 * scale : 14 * scale,
            }}
            numberOfLines={1}
          >
            {email}
          </Text>
        ) : null}
      </View>
      <Text style={{ fontSize: 12, color: colors.textSubtle, marginTop: 8, textAlign: "center" }}>
        Escala reducida — impresión real {PRINT_WIDTH}×{PRINT_HEIGHT}px @ 300 DPI
      </Text>
    </View>
  );
}
