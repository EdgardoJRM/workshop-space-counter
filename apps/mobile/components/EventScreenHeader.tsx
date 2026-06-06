import { Text, View } from "react-native";
import { DotGrid } from "@/components/DotGrid";
import { useAppTheme } from "@/lib/useAppTheme";

/** Cabecera ondulada del tab Evento (mockup). */
export function EventScreenHeader({ title }: { title: string }) {
  const { colors, styles } = useAppTheme();

  return (
    <View style={{ marginHorizontal: -16, marginTop: -16, marginBottom: 8 }}>
      <View
        style={{
          backgroundColor: colors.header,
          paddingTop: 12,
          paddingBottom: 36,
          paddingHorizontal: 20,
          overflow: "hidden",
        }}
      >
        <View style={{ position: "absolute", top: 8, right: 16 }}>
          <DotGrid color="rgba(255,255,255,0.28)" />
        </View>
        <Text
          style={[
            styles.heroTitle,
            { fontSize: 20, textAlign: "center", marginTop: 8 },
          ]}
        >
          {title}
        </Text>
      </View>
      <View
        style={{
          height: 28,
          backgroundColor: colors.background,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          marginTop: -24,
        }}
      />
    </View>
  );
}
