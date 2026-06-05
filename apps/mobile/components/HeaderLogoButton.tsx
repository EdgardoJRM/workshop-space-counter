import { Pressable } from "react-native";
import { AppLogo } from "./AppLogo";

export function HeaderLogoButton() {
  return (
    <Pressable hitSlop={8}>
      <AppLogo size={34} />
    </Pressable>
  );
}
