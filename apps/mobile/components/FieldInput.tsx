import type { ReactNode } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

export function FieldInput({
  label,
  leftIcon,
  rightIcon,
  ...props
}: TextInputProps & {
  label: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}) {
  const { colors, styles } = useAppTheme();

  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: webBrand.white,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 12,
          minHeight: 48,
        }}
      >
        {leftIcon ? <View style={{ marginRight: 8 }}>{leftIcon}</View> : null}
        <TextInput
          style={[
            styles.input,
            {
              flex: 1,
              borderWidth: 0,
              backgroundColor: "transparent",
              paddingHorizontal: 0,
              marginTop: 0,
            },
          ]}
          placeholderTextColor={colors.textSubtle}
          {...props}
        />
        {rightIcon ? <View style={{ marginLeft: 8 }}>{rightIcon}</View> : null}
      </View>
    </View>
  );
}
