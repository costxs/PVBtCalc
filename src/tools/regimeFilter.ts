/**
 * regimeFilter.ts
 * ------------------------------------------------------------------
 * Bug (2026-09): resultCurves.curves persiste em localStorage (sobrevive a
 * reload) e mistura curvas Linear e Radial no MESMO array -- cada curva ja
 * carrega seu proprio `flowRegime`, mas nada filtrava por ele antes de
 * desenhar o grafico/tabela, entao uma curva radial salva era plotada como
 * se fosse linear (e vice-versa) sempre que o toggle de regime da UI nao
 * batia com a curva. Um unico ponto de verdade pra essa comparacao, usado
 * por Chart.tsx e Results.tsx, evita reintroduzir o bug em um dos dois.
 */
import type { FlowRegime } from "../redux/radial/slice";

/** Curvas salvas ANTES do campo flowRegime existir (legado) nao tem o
 * campo -- tratadas como "linear" (unico regime que existia entao). */
export function curveFlowRegime(curveRegime: FlowRegime | undefined): FlowRegime {
  return curveRegime ?? "linear";
}

export function matchesFlowRegime(curveRegime: FlowRegime | undefined, activeRegime: FlowRegime): boolean {
  return curveFlowRegime(curveRegime) === activeRegime;
}
