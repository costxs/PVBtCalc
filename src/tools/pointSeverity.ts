/**
 * pointSeverity.ts
 * ------------------------------------------------------------------
 * Regra de combinacao status[i] + withinValidityRange[i] -> um unico
 * marcador de severidade por ponto da curva radial (Fase 4).
 *
 * Fica separada do componente para ser testavel sem DOM. O UNICO
 * consumidor e <PointMarker> em Results.tsx -- nao duplicar esta logica
 * em outro lugar.
 *
 * Prioridade (nunca dois marcadores na mesma celula):
 *   status !== "ok"                        -> "error"  (resultado numerico invalido)
 *   status === "ok" && withinValidity===false -> "warn" (fora da janela do artigo)
 *   caso contrario                          -> "none"
 *
 * O tooltip nunca escolhe um motivo e omite o outro: e a juncao das
 * razoes aplicaveis com " e " (o ponto do piso, por construcao, e
 * "clipped" E fora da janela ao mesmo tempo).
 *
 * status === undefined (curva linear, ou run antiga em cache sem o
 * campo) => "none".
 */
export type PointSeverity = "error" | "warn" | "none";

// Cores da distincao ja fixada no projeto (Fase 4) -- #c0392b e o vermelho de
// erro (SimuCard), #DF831A o ambar do botao Reset. Uma fonte so: consomem
// <PointMarker> em Results.tsx e o banner de validade em Chart.tsx (Fase 5).
// NAO inventar uma terceira cor.
export const SEVERITY_COLORS = { error: "#c0392b", warn: "#DF831A" } as const;

export interface PointSeverityResult {
  level: PointSeverity;
  tooltip: string;
}

export function pointSeverity(
  status: string | undefined,
  withinValidity: boolean | undefined
): PointSeverityResult {
  if (status === undefined) return { level: "none", tooltip: "" };

  const reasons: string[] = [];
  if (status !== "ok") reasons.push(`resultado inválido (${status})`);
  if (withinValidity === false) reasons.push("vazão fora da janela validada pelo artigo");

  const level: PointSeverity =
    status !== "ok" ? "error" : withinValidity === false ? "warn" : "none";

  return { level, tooltip: reasons.join(" e ") };
}
