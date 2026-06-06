import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/lib/session-context";
import { WORKSHOP_SLUGS, getWorkshopLabel, type WorkshopSlug } from "@/lib/workshops";
import { useAppTheme } from "@/lib/useAppTheme";
import { webBrand } from "@/lib/ui";

/** Selector estilo mockup (dropdown TALLER). */
export function WorkshopDropdown() {
  const { workshop, setWorkshop } = useSession();
  const { colors, styles } = useAppTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.sectionLabel}>Taller</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: webBrand.white,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ flex: 1, fontSize: 15, color: colors.text, fontWeight: "500" }}>
          {getWorkshopLabel(workshop)} — Sesión en vivo
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textSubtle} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              backgroundColor: webBrand.white,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 16,
              maxHeight: "50%",
            }}
          >
            <Text style={[styles.title, { fontSize: 17, marginBottom: 12 }]}>Taller</Text>
            <ScrollView>
              {WORKSHOP_SLUGS.map((slug) => (
                <Pressable
                  key={slug}
                  onPress={() => {
                    setWorkshop(slug as WorkshopSlug);
                    setOpen(false);
                  }}
                  style={{
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: workshop === slug ? "700" : "400",
                      color: workshop === slug ? colors.primary : colors.text,
                    }}
                  >
                    {getWorkshopLabel(slug)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
