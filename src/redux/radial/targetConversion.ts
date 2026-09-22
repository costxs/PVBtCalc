
import { parseDecimal } from "../../tools/parseDecimal";

export const IN_TO_M = 0.0254;
export const FT_PER_L = 0.3048;
export const L_CHAR = 1.0;

export type TargetMode = "length" | "skin";

export function lambdaToFt(lambda: number, L: number = L_CHAR): number {
  return (lambda * L) / FT_PER_L;
}

export function ftToLambda(ft: number, L: number = L_CHAR): number {
  return (ft * FT_PER_L) / L;
}

export function lambdaToSkin(lambda: number, beta: number): number {
  return -Math.log((beta + lambda) / beta);
}

export function skinToLambda(skin: number, beta: number): number {
  return beta * (Math.exp(-skin) - 1);
}

export function computeBeta(wellboreRadiusIn: number, L: number = L_CHAR): number {
  return (wellboreRadiusIn * IN_TO_M) / L;
}

export interface TargetChip {
  lambda: number;
  label: number;
  unit: "ft" | "";
}

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

export function parseTargetInput(
  text: string,
  mode: TargetMode,
  { L = L_CHAR, beta }: { L?: number; beta: number }
): number | null {
  const n = parseDecimal(text);
  if (n === null) return null;
  if (mode === "length") {
    if (n <= 0) return null;
    return ftToLambda(n, L);
  }
  return skinToLambda(n, beta);
}

function roundDisplay(v: number): number {
  return Math.round(v * 100) / 100;
}
