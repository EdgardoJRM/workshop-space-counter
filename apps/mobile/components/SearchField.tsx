import { Ionicons } from "@expo/vector-icons";
import { TextInput, View } from "react-native";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

export function SearchField({
  value,
  onChangeText,
  placeholder = "Buscar nombre o email…",
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  const { colors, styles } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: webBrand.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        marginBottom: 12,
      }}
    >
      <Ionicons name="search-outline" size={20} color={colors.textSubtle} />
      <TextInput
        style={[
          styles.input,
          {
            flex: 1,
            borderWidth: 0,
            marginTop: 0,
            backgroundColor: "transparent",
          },
        ]}
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
