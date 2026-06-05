import { Stack } from "expo-router";
import { SessionProvider } from "@/lib/session-context";
import { ThemeProvider } from "@/lib/theme";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(main)" />
      </Stack>
      </SessionProvider>
    </ThemeProvider>
  );
}
