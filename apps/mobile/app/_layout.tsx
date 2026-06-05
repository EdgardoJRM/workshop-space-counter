import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "@/lib/session-context";
import { ThemeProvider } from "@/lib/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
    <ThemeProvider>
      <SessionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(main)" />
      </Stack>
      </SessionProvider>
    </ThemeProvider>
    </SafeAreaProvider>
  );
}
