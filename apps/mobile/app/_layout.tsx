import { Stack } from "expo-router";
import { ThemeProvider } from "@/lib/theme";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(main)" />
      </Stack>
    </ThemeProvider>
  );
}
