/**
 * Computes brand-aware button colors.
 *
 * Button background exactly matches the chain's `primaryColor`.
 * Button text (fg) is explicitly configured per chain via `chainFeatures.buttonFg`.
 */

export interface BrandButtonColors {
  /** CSS background colour for the button */
  bg: string;
  /** CSS foreground (text) colour for the button */
  fg: string;
}

/**
 * Returns the button background color.
 * The fg (text color) is determined by the explicit `buttonFg` chain config.
 */
export function getBrandButtonColors(
  primaryColor: string,
  buttonFg: "black" | "white" = "white"
): BrandButtonColors {
  const fg = buttonFg === "black" ? "#19191A" : "#ffffff";
  return { bg: primaryColor, fg };
}
