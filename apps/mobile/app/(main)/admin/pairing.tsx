import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  createPrinterPairingCode,
  fetchPrinterAgents,
  revokePrinterAgent,
} from "@/lib/admin-api";
import { useAppTheme } from "@/lib/useAppTheme";

export default function AdminPairingScreen() {
  const { colors, styles } = useAppTheme();
  const [agents, setAgents] = useState<
    { id: string; name: string | null; lastSeenAt: string | null }[]
  >([]);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPrinterAgents();
      setAgents(data.agents);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate() {
    setError(null);
    try {
      const data = await createPrinterPairingCode();
      setCode(data.code);
      setExpiresAt(data.expiresAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <ScrollView style={styles.screenPadded}>
      <Text style={[styles.subtitle, { marginBottom: 16 }]}>
        Genera un código de 8 caracteres. En la Mac del evento: zsh emparejar.sh
      </Text>

      <Pressable style={styles.btnPrimary} onPress={() => void generate()}>
        <Text style={styles.btnPrimaryText}>Generar código nuevo</Text>
      </Pressable>

      {code ? (
        <View style={[styles.card, { marginTop: 16, alignItems: "center" }]}>
          <Text style={styles.sectionLabel}>Código</Text>
          <Text
            style={{
              fontSize: 36,
              fontWeight: "700",
              letterSpacing: 8,
              color: colors.text,
              fontVariant: ["tabular-nums"],
            }}
          >
            {code}
          </Text>
          {expiresAt ? (
            <Text style={[styles.rowMeta, { marginTop: 8 }]}>
              Expira: {new Date(expiresAt).toLocaleString("es-PR")}
            </Text>
          ) : null}
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Macs conectadas</Text>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : agents.length === 0 ? (
        <Text style={styles.subtitle}>Ninguna aún.</Text>
      ) : (
        agents.map((a) => (
          <View
            key={a.id}
            style={[styles.rowCard, { borderWidth: 1, borderColor: colors.border }]}
          >
            <Text style={styles.rowTitle}>{a.name ?? "Impresora"}</Text>
            <Text style={styles.rowMeta}>
              Último visto:{" "}
              {a.lastSeenAt
                ? new Date(a.lastSeenAt).toLocaleString("es-PR")
                : "nunca"}
            </Text>
            <Pressable
              style={[styles.btnOutline, { marginTop: 10, alignSelf: "flex-start" }]}
              onPress={() =>
                void revokePrinterAgent(a.id).then(() => load())
              }
            >
              <Text style={styles.btnOutlineText}>Revocar</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}
