import { Text, View } from "react-native";
import { useSession } from "@/lib/session-context";
import { getWorkshopLabel } from "@/lib/workshops";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

export function LabelPreview({
  name = "MARÍA R.",
  email = "maria@ejemplo.com",
  showEmail,
  showWorkshop,
  fontLarge = 28,
  fontSmall = 10,
}: {
  name?: string;
  email?: string;
  showEmail: boolean;
  showWorkshop: boolean;
  fontLarge?: number;
  fontSmall?: number;
}) {
  const { workshop } = useSession();
  const { colors } = useAppTheme();

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
        Vista previa (3×2 pulgadas)
      </Text>
      <View
        style={{
          backgroundColor: webBrand.white,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          minHeight: 120,
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: fontLarge * 0.78, fontWeight: "800", color: colors.text }}>
          {name}
        </Text>
        {showEmail ? (
          <Text style={{ fontSize: fontSmall, color: colors.textMuted, marginTop: 4 }}>
            {email}
          </Text>
        ) : null}
        <View
          style={{
            height: 2,
            backgroundColor: colors.accent,
            marginVertical: 10,
            width: "100%",
          }}
        />
        {showWorkshop ? (
          <Text style={{ fontSize: 11, color: colors.textMuted }}>
            {getWorkshopLabel(workshop)} — Sesión en vivo
          </Text>
        ) : null}
      </View>
      <Text style={{ fontSize: 12, color: colors.textSubtle, marginTop: 8 }}>
        La apariencia final puede variar ligeramente al imprimir.
      </Text>
    </View>
  );
}
