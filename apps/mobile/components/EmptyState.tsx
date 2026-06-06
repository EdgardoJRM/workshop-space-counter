import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useAppTheme } from "@/lib/useAppTheme";

const PLUS_OFFSETS = [
  { top: 8, left: 24 },
  { top: 20, right: 20 },
  { bottom: 28, left: 12 },
  { top: 40, left: 8 },
];

/** Sin evento seleccionado — mockup. */
export function EmptyState({
  title = "Aún no hay nada aquí",
  message = "Selecciona un evento en la pestaña Evento.",
  hintArrowToEvento = true,
}: {
  title?: string;
  message?: string;
  hintArrowToEvento?: boolean;
}) {
  const { colors, styles } = useAppTheme();

  return (
    <View style={[styles.card, { alignItems: "center", paddingVertical: 36, paddingHorizontal: 24 }]}>
      <View
        style={{
          width: 130,
          height: 130,
          marginBottom: 20,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {PLUS_OFFSETS.map((pos, i) => (
          <Text
            key={i}
            style={{
              position: "absolute",
              fontSize: 14,
              color: colors.textSubtle,
              opacity: 0.5,
              ...pos,
            }}
          >
            +
          </Text>
        ))}
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: "rgba(255, 201, 7, 0.22)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="calendar-outline" size={44} color={colors.primary} />
        </View>
        <View
          style={{
            position: "absolute",
            bottom: 14,
            right: 22,
            backgroundColor: colors.accent,
            borderRadius: 12,
            padding: 6,
          }}
        >
          <Ionicons name="ticket" size={18} color={colors.onAccent} />
        </View>
      </View>
      <Text style={[styles.title, { fontSize: 20, textAlign: "center" }]}>{title}</Text>
      <Text style={[styles.subtitle, { textAlign: "center", marginTop: 10, lineHeight: 22 }]}>
        {message}
      </Text>
      {hintArrowToEvento ? (
        <Text
          style={{
            marginTop: 24,
            fontSize: 40,
            color: colors.accent,
            transform: [{ rotate: "-35deg" }],
          }}
        >
          ↙
        </Text>
      ) : null}
    </View>
  );
}
