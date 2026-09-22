import type { TFn } from "../i18n";

export type PointSeverity = "error" | "warn" | "none";

export const SEVERITY_COLORS = { error: "#c0392b", warn: "#DF831A" } as const;

export interface PointSeverityResult {
  level: PointSeverity;
  tooltip: string;
}

export function pointSeverity(
  status: string | undefined,
  withinValidity: boolean | undefined,
  t: TFn
): PointSeverityResult {
  if (status === undefined) return { level: "none", tooltip: "" };

  const reasons: string[] = [];
  if (status !== "ok") reasons.push(t("severity.invalid_result", { status }));
  if (withinValidity === false) reasons.push(t("severity.outside_window"));

  const level: PointSeverity =
    status !== "ok" ? "error" : withinValidity === false ? "warn" : "none";

  return { level, tooltip: reasons.join(t("severity.and")) };
}
