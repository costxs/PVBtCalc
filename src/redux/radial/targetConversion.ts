/**
 * targetConversion.ts
 * ------------------------------------------------------------------
 * Fixes the bug where toggling the Length/Skin target mode just
 * re-labeled the chips without converting the underlying values.
 *
 * RULE: the stored state is NEVER "whatever is written on the chip
 * right now". It is always lambda (dimensionless). Length and Skin
 * are just two display/edit LENSES over the same lambda array --
 * never two independent arrays that can drift out of sync.
 *
 *   targetsLambda: number[]         <- single source of truth
 *   targetMode:   "length" | "skin" <- only decides how to RENDER
 *
 * Toggling the mode never touches targetsLambda -- it only changes
 * how each chip is formatted on screen. Editing a chip (in either
 * mode) converts the typed text back to lambda BEFORE saving.
 */

export const IN_TO_M = 0.0254; // inches -> meters
export const FT_PER_L = 0.3048; // meters per foot
export const L_CHAR = 1.0; // characteristic length of the model, meters

export type TargetMode = "length" | "skin";

/** lambda -> physical length in feet, for display in Length mode */
export function lambdaToFt(lambda: number, L: number = L_CHAR): number {
  return (lambda * L) / FT_PER_L;
}

/** feet -> lambda, for saving what the user typed in Length mode */
export function ftToLambda(ft: number, L: number = L_CHAR): number {
  return (ft * FT_PER_L) / L;
}

/**
 * lambda -> skin, Hawkins approximation (stimulated zone permeability
 * much greater than the matrix -- k_s >> k).
 * beta = r_w / L, the dimensionless wellbore radius.
 */
export function lambdaToSkin(lambda: number, beta: number): number {
  return -Math.log((beta + lambda) / beta);
}

/** skin -> lambda, for saving what the user typed in Skin mode */
export function skinToLambda(skin: number, beta: number): number {
  return beta * (Math.exp(-skin) - 1);
}

/** beta = r_w / L, from the wellbore radius (inches) already computed in state */
export function computeBeta(wellboreRadiusIn: number, L: number = L_CHAR): number {
  return (wellboreRadiusIn * IN_TO_M) / L;
}

export interface TargetChip {
  lambda: number;
  label: number;
  unit: "ft" | "";
}

/**
 * Formats the canonical lambda array for the chips, in the current mode.
 * This is the ONLY function that decides what is written on each chip.
 */
export function formatTargets(
  targetsLambda: number[],
  mode: TargetMode,
  { L = L_CHAR, beta }: { L?: number; beta: number }
): TargetChip[] {
  return targetsLambda.map((lambda) => {
    const raw = mode === "length" ? lambdaToFt(lambda, L) : lambdaToSkin(lambda, beta);
    return { lambda, label: roundDisplay(raw), unit: mode === "length" ? "ft" : "" };
  });
}

/**
 * Converts the text the user typed (in EITHER mode) back to lambda,
 * for storage. Call this in the onChange/onSubmit of a chip input --
 * never store the raw text as if it were the data.
 */
export function parseTargetInput(
  text: string,
  mode: TargetMode,
  { L = L_CHAR, beta }: { L?: number; beta: number }
): number | null {
  const n = Number(text);
  if (Number.isNaN(n)) return null;
  if (mode === "length") {
    if (n <= 0) return null; // physical length can't be <= 0
    return ftToLambda(n, L);
  }
  // skin mode: negative values are the normal case here.
  // skin >= 0 (damaged well) is technically valid too, just not the typical use.
  return skinToLambda(n, beta);
}

function roundDisplay(v: number): number {
  return Math.round(v * 100) / 100;
}
