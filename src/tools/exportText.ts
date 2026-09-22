import type { TFn, TKey, TParams } from "../i18n";

// Every piece of text written into an exported workbook by the client-side writer.
//
// The export is ALWAYS English, whatever language the interface is in, so files are
// comparable across users and readable by scripts. There is deliberately no language
// parameter anywhere in the export path, and nothing in here reads the UI language.
//
// This file mirrors PVBtCalc-Back/app/services/export_text.py (the server writer). Both
// are pinned to shared-fixtures/export_text.json by their test suites, so the two writers
// cannot drift apart. It is intentionally NOT fed from the interface dictionary
// (i18n/en.ts): rewording a label on screen must never change an exported file.

export const NOTE_HEADER = "Note";
export const NOT_AVAILABLE = "not available";
export const CHART_SUMMARY_SHEET = "Chart Summary";

// One name for the wormhole length quantity in every sheet. "L" is NOT used: it collides
// with the characteristic length L in the model's nomenclature.
export const WORMHOLE_LENGTH = "Wormhole Length";

export const SIM_HEADER = ["q0 [gal/(ft.min)]", "V_A [gal/ft]", "iv [m/s]", "wv [m/s]", "dv [m/s]", "1/Da", "tbt [s]", NOTE_HEADER];
export const DESIGN_HEADER = [`${WORMHOLE_LENGTH} [ft]`, "q_opt [gal/(ft.min)]", "V_opt [gal/ft]", "tbt [min]", "Temperature [°C]", NOTE_HEADER];
export const SKIN_HEADER = ["V_A [gal/ft]", "skin", `${WORMHOLE_LENGTH} [ft]`, NOTE_HEADER];

// Optimum Analysis (radial): swept parameter -> [label, unit]. Temperature is Celsius: the
// model, T_CALIBRATED_K and every backend payload stay Kelvin internally; roundCelsius
// (temperature.ts) converts at the display boundary, applied by whoever builds the row/note
// values (analysisTable.ts's formatSweepX for Analysis rows/notes, columnsConfig.ts /
// export_workbook.py for Design rows).
export const ANALYSIS_META: Record<string, [string, string]> = {
  temperature: ["Temperature", "°C"],
  porosity: ["Porosity", "fraction"],
  acid_concentration: ["Acid Concentration", "w/w"],
  wellbore_diameter: ["Wellbore Diameter", "in"],
  payzone_thickness: ["Payzone Thickness", "ft"],
};

export function analysisHeader(sweepParam: string): string[] {
  const [label, unit] = ANALYSIS_META[sweepParam] ?? [sweepParam, ""];
  return [`${label} [${unit}]`, "q_opt [gal/(ft.min)]", "V_opt [gal/ft]", "tbt [min]", NOTE_HEADER];
}

export function joinAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** 6 significant digits, no trailing zeros (mirrors Python format(x, ".6g")). */
export function fmtNum(x: number): string {
  return String(Number(x.toPrecision(6)));
}

const qOptSuffix = (qOptStr: string | null): string => (qOptStr ? `; q_opt = ${qOptStr} gal/(ft·min)` : "");

// ---- Simulation sheet (radial)
export function simNote(isBorder: boolean, qOptStr: string | null): string {
  const head = isBorder ? "Minimum at the edge of the simulated range" : "Minimum V_A of this simulation";
  return head + qOptSuffix(qOptStr);
}

// ---- Design sheet naming. The sheet name uses a bare "C" (no degree sign): xlsx sheet names
// accept "." and "°" but this keeps one look for the name and its own embedded figure legend
// (the client fallback writes no figures, but the name must still match the server's).
// The 2-decimal Celsius value is exact for any input this app produces -- see
// temperature.ts's roundCelsius for the float noise it is scrubbing, not rounding away.
export function designSheetLabel(temperatureC: number): string {
  return `${temperatureC.toFixed(2)} C`;
}

export function designSheetName(temperatureC: number): string {
  return `Design ${designSheetLabel(temperatureC)}`;
}

// ---- Design sheet
export function designTargetNote(targetStr: string, lengthFt: number): string {
  return `Target ${targetStr} ft (${WORMHOLE_LENGTH} = ${lengthFt.toFixed(2)} ft)`;
}

export function designMissedNote(targetStrs: string[], lastLengthFt: number): string {
  const label = targetStrs.length === 1 ? "Target" : "Targets";
  return `${label} ${joinAnd(targetStrs)} ft not reached — table ends at ${lastLengthFt.toFixed(2)} ft (limit 1000 gal/ft)`;
}

// ---- Optimum Analysis sheet
// T_CALIBRATED_K is the only calibrated range in the app, and it is always the temperature
// sweep's range, so this note's unit is fixed at °C (the caller passes lo/hi already
// converted — see analysisTable.ts's buildAnalysisRows).
export const analysisNoteOutside = (lo: number, hi: number): string => `Outside calibrated range (${fmtNum(lo)}–${fmtNum(hi)} °C)`;
export const analysisNoteSkipped = (): string => "No interior optimum — point omitted";
export const analysisNoteClipped = (xStr: string, unit: string): string => `Series truncated — ${xStr} ${unit} exceeds the 1000 gal/ft limit`;

// ---- Skin sheet
export function skinNote(targetSkin: number | null | undefined): string {
  return targetSkin == null ? "Final skin" : `Target skin (closest to ${fmtNum(targetSkin)})`;
}

// ---- Linear workbook
export function linearNote(isBorder: boolean, qOptStr: string | null, unit: string): string {
  const head = isBorder ? "Minimum at the edge of the simulated range" : "Minimum PVBT of this simulation";
  return head + (qOptStr ? `; q_opt = ${qOptStr} ${unit}` : "");
}

// ---- `t` handed to the shared table builders (columnsConfig / analysisTable) when the
// export uses them. Backed by the constants above, NOT by the interface dictionary. The
// builders only use a handful of keys for headers and notes; descriptions are tooltips and
// are never exported, so they come back empty. Any other key is a bug and throws.
const EXPORT_TABLE: Partial<Record<TKey, string>> = {
  "col.target": "target",
  "col.skin": "skin",
  "col.wormhole_length": WORMHOLE_LENGTH,
  "col.temperature": "Temperature",
  "col.volume_total": "Total Volume",
  "col.q0_input": "q0 (input)",
  "col.note": NOTE_HEADER,
  "analysis.p_value": "Value",
  "analysis.p_temperature": ANALYSIS_META.temperature[0],
  "analysis.p_porosity": ANALYSIS_META.porosity[0],
  "analysis.p_acid_concentration": ANALYSIS_META.acid_concentration[0],
  "analysis.p_wellbore_diameter": ANALYSIS_META.wellbore_diameter[0],
  "analysis.p_payzone_thickness": ANALYSIS_META.payzone_thickness[0],
  "analysis.u_fraction": ANALYSIS_META.porosity[1],
  "analysis.note_outside": "Outside calibrated range ({lo}–{hi} °C)",
  "analysis.note_skipped": "No interior optimum — point omitted",
  "analysis.note_clipped": "Series truncated — {x} {unit} exceeds the 1000 gal/ft limit",
};

export const EXPORT_TABLE_KEYS = Object.keys(EXPORT_TABLE) as TKey[];

export const EXPORT_T: TFn = (key: TKey, params?: TParams) => {
  if (key.startsWith("col.d_") || key.startsWith("analysis.d_")) return "";
  const raw = EXPORT_TABLE[key];
  if (raw === undefined) throw new Error(`export text has no entry for "${key}"`);
  return params ? raw.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m)) : raw;
};

// Failed export request, as a dictionary key + params so the interface can show it in the
// current language (translateIfKey). Carries no language of its own.
export function requestFailed(route: string, status: number, detail: string): string {
  return `export.request_failed?${JSON.stringify({ route, status, detail: detail.slice(0, 300) })}`;
}
