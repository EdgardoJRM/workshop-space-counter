import { Ionicons } from "@expo/vector-icons";
import { TextInput, View } from "react-native";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

export function SearchField({
  value,
  onChangeText,
  placeholder = "Buscar nombre o email…",
  style,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  style?: object;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: webBrand.off,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 12,
        ...style,
      }}
    >
      <Ionicons name="search-outline" size={20} color={colors.textSubtle} />
      <TextInput
        style={{
          flex: 1,
          marginLeft: 8,
          fontSize: 16,
          color: colors.text,
          paddingVertical: 4,
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}
