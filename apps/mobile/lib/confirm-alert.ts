import { Alert } from "react-native";

export function confirmDestructive(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>
): void {
  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    {
      text: "Confirmar",
      style: "destructive",
      onPress: () => void onConfirm(),
    },
  ]);
}
