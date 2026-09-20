
import type { Curve } from "../redux/storageresults/slice";
import { saveBlob } from "./directoryExport";
import { API_BASE } from "../services/api";

export type FigureSize = "single" | "double";

interface AxisLimitsPayload {
  min?: number;
  max?: number;
}

export interface RadialExportPayload {
  inputs: {
    simulation_id: string;
    rock_type: string;
    acid_type: string;
    acid_concentration: number | null;
    porosity: number | null;
    temperature_k: number | null;
    wellbore_size_in: number | null;
    wellbore_mode: string;
    wellbore_radius_in: number | null;
    payzone_thickness_ft: number | null;
    flowrate_min_bbl_min: number | null;
    flowrate_max_bbl_min: number | null;
    number_of_steps: number | null;
    targets_label: string;
    flowing_fraction: number | null;
  };
  curves: any[];
  design_series: any[];
  skin_series: Record<string, { x: number; y: number; l_ft: number }[]>;
  options: {
    target_lengths?: number[] | null;
    target_skin?: number | null;
    active_targets?: string[] | null;
    active_temperatures?: number[] | null;
    active_flowrates?: string[] | null;
    show_optimum_path: boolean;
    show_validity_band: boolean;
    sim_x_limits?: AxisLimitsPayload | null;
    sim_y_limits?: AxisLimitsPayload | null;
    design_x_limits?: AxisLimitsPayload | null;
    design_y_limits?: AxisLimitsPayload | null;
    skin_x_limits?: AxisLimitsPayload | null;
    skin_y_limits?: AxisLimitsPayload | null;
  };
}

export function buildRadialExportPayload(
  radialState: any,
  simulationCurves: Curve[],
  rawRadialCurves: any[],
  simulationId: string,
  options: Partial<RadialExportPayload["options"]> = {}
): RadialExportPayload {
  const baseCurve = simulationCurves[0];
  const lastRunSetup = radialState?.lastRunSetup;

  const rawTemp = baseCurve?.temperature != null ? Number(baseCurve.temperature) : null;
  const temperatureK = rawTemp != null && Number.isFinite(rawTemp)
    ? (rawTemp >= 100 ? rawTemp : Number((rawTemp + 273.15).toFixed(2)))
    : null;

  const targetsLabel = rawRadialCurves.map((c) => c.target_label).filter(Boolean).join(", ");

  return {
    inputs: {
      simulation_id: simulationId || "—",
      rock_type: baseCurve?.rock ?? "",
      acid_type: baseCurve?.acid ?? "",
      acid_concentration: baseCurve?.concentration ?? null,
      porosity: baseCurve?.porosity ?? null,
      temperature_k: temperatureK,
      wellbore_size_in: radialState?.wellboreSize != null ? Number(radialState.wellboreSize) : null,
      wellbore_mode: radialState?.wellboreSizeMode ?? "diameter",
      wellbore_radius_in: baseCurve?.wellboreRadiusIn ?? null,
      payzone_thickness_ft: baseCurve?.payzoneThicknessFt ?? null,
      flowrate_min_bbl_min: lastRunSetup?.minimum_flowrate != null ? Number(lastRunSetup.minimum_flowrate) : null,
      flowrate_max_bbl_min: lastRunSetup?.flowrate != null ? Number(lastRunSetup.flowrate) : null,
      number_of_steps: lastRunSetup?.step_numbers != null ? Number(lastRunSetup.step_numbers) : null,
      targets_label: targetsLabel || "—",
      flowing_fraction: (() => {
        const fVal = baseCurve?.flowingFraction ?? null;
        if (fVal == null && import.meta.env.DEV) {
          console.warn(`exportRadialServer.ts: Flowing Fraction (f) indisponivel para simulacao ${simulationId} -- baseCurve.flowingFraction e null/undefined (curva salva antes desta chave existir?)`);
        }
        return fVal;
      })(),
    },
    curves: rawRadialCurves,
    design_series: radialState?.designPlotData?.series ?? [],
    skin_series: radialState?.skinEvolutionData ?? {},
    options: {
      show_optimum_path: true,
      show_validity_band: true,
      ...options,
    },
  };
}

function filenameFromResponse(res: Response, fallback: string): string {
  const cd = res.headers.get("Content-Disposition") || "";
  const match = /filename="([^"]+)"/.exec(cd);
  return match ? match[1] : fallback;
}

export interface ServerExportResult {
  savedAs: string;
  usedFallback: boolean;
}

export async function exportRadialWorkbookServer(
  payload: RadialExportPayload,
  token: string,
  opts: { includeImages?: boolean; directoryHandle?: FileSystemDirectoryHandle | null } = {}
): Promise<ServerExportResult> {
  const includeImages = opts.includeImages !== false;
  const res = await fetch(`${API_BASE}/export/radial?include_images=${includeImages}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`/export/radial falhou (HTTP ${res.status}): ${detail.slice(0, 300)}`);
  }
  const blob = await res.blob();
  const suffix = includeImages ? "" : "_TablesOnly";
  const fallbackName = `PVBtCalc_Radial_${payload.inputs.simulation_id}${suffix}.xlsx`;
  return saveBlob(opts.directoryHandle ?? null, filenameFromResponse(res, fallbackName), blob);
}

export async function exportRadialFiguresServer(
  payload: RadialExportPayload,
  size: FigureSize,
  token: string,
  opts: { directoryHandle?: FileSystemDirectoryHandle | null } = {}
): Promise<ServerExportResult> {
  const res = await fetch(`${API_BASE}/export/radial/figures?size=${size}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`/export/radial/figures falhou (HTTP ${res.status}): ${detail.slice(0, 300)}`);
  }
  const blob = await res.blob();
  const fallbackName = `PVBtCalc_Radial_Figures_${payload.inputs.simulation_id}.zip`;
  return saveBlob(opts.directoryHandle ?? null, filenameFromResponse(res, fallbackName), blob);
}
