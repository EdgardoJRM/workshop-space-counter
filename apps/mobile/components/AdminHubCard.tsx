import { Pressable, Text, View } from "react-native";
import { useAppTheme } from "@/lib/useAppTheme";

export function AdminHubCard({
  kicker,
  title,
  description,
  onPress,
}: {
  kicker: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const { colors, styles } = useAppTheme();

  return (
    <Pressable onPress={onPress} style={[styles.rowCard, { borderWidth: 1, borderColor: colors.border }]}>
      <Text style={[styles.sectionLabel, { marginBottom: 4 }]}>{kicker}</Text>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={[styles.rowMeta, { marginTop: 6 }]}>{description}</Text>
    </Pressable>
  );
}
