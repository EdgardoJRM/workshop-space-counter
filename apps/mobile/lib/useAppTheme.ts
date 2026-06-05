import { useMemo } from "react";
import { colorsFromBrand, createUiStyles, type AppColors, type UiStyles } from "./ui";
import { useBrand } from "./theme";

export function useAppTheme() {
  const { brand } = useBrand();
  const colors = useMemo(() => colorsFromBrand(brand), [brand]);
  const styles = useMemo(() => createUiStyles(colors), [colors]);
  return { colors, styles, brand };
}
