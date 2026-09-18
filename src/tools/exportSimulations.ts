/**
 * exportSimulations.ts
 * ------------------------------------------------------------------
 * Agrupa state.resultCurves.curves (uma linha por curva/alvo) em
 * "simulacoes" para a aba EXPORT: radial agrupa pelo prefixo do id antes de
 * " · " (mesma convencao que Chart.tsx ja usa pra filtrar
 * radialSimulationCurves); linear e 1 curva = 1 simulacao (nao ha
 * agrupamento por id no modelo linear).
 *
 * toRawRadialCurve reconstroi o formato RadialCurveResult (snake_case) que o
 * backend espera a partir da Curve camelCase salva em resultCurves -- so
 * troca de forma, nenhum calculo novo. Isso permite exportar QUALQUER
 * simulacao radial ja salva (nao so a rodada ATIVA em radialState, que so
 * guarda design_series/skin_series da ULTIMA rodada) com a aba Simulation
 * completa + figura; Design/Skin so entram quando a simulacao selecionada e
 * a rodada ativa (unica fonte que o app guarda pra esses dois).
 */
import type { Curve } from "../redux/storageresults/slice";
import type { RadialExportPayload } from "./exportRadialServer";

export interface SimulationGroup {
  simId: string;
  flowRegime: "linear" | "radial";
  rock: string;
  acid: string;
  temperature: number | null;
  targets: string[];
  curves: Curve[];
  hasData: boolean;
}

export function groupSimulations(curves: Curve[]): SimulationGroup[] {
  const order: string[] = [];
  const groups = new Map<string, Curve[]>();
  for (const c of curves) {
    const isRadial = c.flowRegime === "radial";
    const simId = isRadial ? c.id.split(" · ")[0] : c.id;
    if (!groups.has(simId)) {
      groups.set(simId, []);
      order.push(simId);
    }
    groups.get(simId)!.push(c);
  }
  return order.map((simId) => {
    const members = groups.get(simId)!;
    const base = members[0];
    return {
      simId,
      flowRegime: base.flowRegime === "radial" ? "radial" : "linear",
      rock: base.rock ?? "",
      acid: base.acid ?? "",
      temperature: base.temperature ?? null,
      targets: members.map((m) => m.targetLabel).filter((t): t is string => !!t),
      curves: members,
      hasData: members.some((m) => (m.flowratePoints?.length ?? 0) > 0),
    };
  });
}

function fillLike<T>(arr: T[] | undefined, n: number, def: T): T[] {
  if (arr && arr.length === n) return arr;
  return new Array(n).fill(def);
}

export function toRawRadialCurve(c: Curve): any {
  const n = c.flowratePoints?.length ?? 0;
  return {
    target: c.target ?? 0,
    target_label: c.targetLabel ?? c.id,
    flowratepoints: c.flowratePoints ?? [],
    pvbtpoints: fillLike(c.pvbtPoints ?? undefined, n, null),
    acidvolumepoints: fillLike(c.acidVolumePoints, n, null),
    insterticialvelocity: fillLike(c.intersticialVelocity, n, 0),
    ida: fillLike(c.iDa, n, 0),
    volumetobt: fillLike(c.volumeToBt, n, null),
    timetobt: fillLike(c.timeToBt, n, null),
    wormholevelocity: fillLike(c.wormholeVelocity, n, 0),
    darcyvelocity: fillLike(c.darcyVelocity, n, 0),
    status: fillLike(c.statusPoints, n, "ok"),
    within_validity_range: fillLike(c.withinValidityRange, n, true),
    metadata: c.metadata ?? null,
  };
}

/** true so pra simulacao radial cujo id bate com a rodada ATIVA de radialState
 * -- unica que tem design_series/skin_series disponiveis (ver cabecalho). */
export function isActiveRadialRun(group: SimulationGroup, radialState: any): boolean {
  return group.flowRegime === "radial" && !!radialState?.lastRunSetup?.id && radialState.lastRunSetup.id === group.simId;
}

export function buildGroupExportPayload(group: SimulationGroup, radialState: any): RadialExportPayload {
  const baseCurve = group.curves[0];
  const isCurrent = isActiveRadialRun(group, radialState);

  const rawTemp = baseCurve?.temperature != null ? Number(baseCurve.temperature) : null;
  const temperatureK = rawTemp != null && Number.isFinite(rawTemp)
    ? (rawTemp >= 100 ? rawTemp : Number((rawTemp + 273.15).toFixed(2)))
    : null;

  const lastRunSetup = isCurrent ? radialState?.lastRunSetup : null;

  return {
    inputs: {
      simulation_id: group.simId || "—",
      rock_type: baseCurve?.rock ?? "",
      acid_type: baseCurve?.acid ?? "",
      acid_concentration: baseCurve?.concentration ?? null,
      porosity: baseCurve?.porosity ?? null,
      temperature_k: temperatureK,
      wellbore_size_in: isCurrent && radialState?.wellboreSize != null ? Number(radialState.wellboreSize) : null,
      wellbore_mode: isCurrent ? (radialState?.wellboreSizeMode ?? "diameter") : "diameter",
      wellbore_radius_in: baseCurve?.wellboreRadiusIn ?? null,
      payzone_thickness_ft: baseCurve?.payzoneThicknessFt ?? null,
      flowrate_min_bbl_min: lastRunSetup?.minimum_flowrate != null ? Number(lastRunSetup.minimum_flowrate) : null,
      flowrate_max_bbl_min: lastRunSetup?.flowrate != null ? Number(lastRunSetup.flowrate) : null,
      number_of_steps: lastRunSetup?.step_numbers != null ? Number(lastRunSetup.step_numbers) : null,
      targets_label: group.targets.join(", ") || "—",
      flowing_fraction: (() => {
        const fVal = baseCurve?.flowingFraction ?? null;
        if (fVal == null && import.meta.env.DEV) {
          console.warn(`exportSimulations.ts: Flowing Fraction (f) indisponivel para simulacao ${group.simId} -- baseCurve.flowingFraction e null/undefined (curva salva antes desta chave existir?)`);
        }
        return fVal;
      })(),
    },
    curves: group.curves.map(toRawRadialCurve),
    design_series: isCurrent ? (radialState?.designPlotData?.series ?? []) : [],
    skin_series: isCurrent ? (radialState?.skinEvolutionData ?? {}) : {},
    options: {
      show_optimum_path: true,
      show_validity_band: true,
      active_targets: group.targets,
    },
  };
}
