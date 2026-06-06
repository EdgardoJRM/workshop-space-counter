import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/useAppTheme";

export function StepperInput({
  value,
  onChangeText,
  onIncrement,
  onDecrement,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const { colors, styles } = useAppTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Pressable
        onPress={onDecrement}
        style={[styles.stepperBtn, { borderRadius: 10 }]}
      >
        <Ionicons name="remove" size={22} color={colors.text} />
      </Pressable>
      <TextInput
        style={[styles.input, { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700" }]}
        keyboardType="number-pad"
        value={value}
        onChangeText={onChangeText}
      />
      <Pressable
        onPress={onIncrement}
        style={[styles.stepperBtn, { borderRadius: 10 }]}
      >
        <Ionicons name="add" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}
