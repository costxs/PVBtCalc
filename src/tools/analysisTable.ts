import type { ColumnConfig } from "../components/DataTable";
import type { TFn, TKey } from "../i18n";
import { T_CALIBRATED_K } from "./sweepValidation";
import { kelvinToCelsius, roundCelsius, T_CALIBRATED_C } from "./temperature";

// The Analysis table's own cell-display precision (DataTable.tsx's defaultFormat rounds any
// plain numeric cell to 3 decimals). The Analysis chart (Chart.tsx) must show the identical
// number for the identical point, so it imports this same constant and calls
// formatSweepX/roundCelsius with it too -- never its own, independently chosen precision.
export const ANALYSIS_DISPLAY_DECIMALS = 3;

// The one place a radial temperature sweep value becomes Celsius for display: reused by both
// this table and the Analysis chart (Chart.tsx), so "same formatter, same rounding" holds by
// construction rather than by two call sites happening to agree.
export function formatSweepX(x: number, sweepParam: string): number {
  return sweepParam === "temperature" ? roundCelsius(x, ANALYSIS_DISPLAY_DECIMALS) : x;
}

// Espelho de _analysis_rows (PVBtCalc-Back/app/services/export_workbook.py) --
// linhas e Nota travadas por shared-fixtures/radial_analysis_table_cases.json.
// Todo texto vem do dicionario (`t`): a tela passa o `t` do idioma escolhido, o export
// passa o `t` fixo em ingles (tools/exportText.ts).

export interface AnalysisTableInput {
  sweepParam: string;
  sweepValues: number[];
  optimumRate: number[];
  optimumVolume: number[];
  hasClippedVolume: boolean;
  firstClippedValue: number | null;
  skippedValues: number[];
  outsideCalibratedRange: number[];
}

// rotulo (chave do dicionario) + unidade (literal neutro, ou chave quando a unidade e uma palavra).
export const ANALYSIS_META: Record<string, { label: TKey; unit: string; unitKey?: TKey }> = {
  temperature: { label: "analysis.p_temperature", unit: "°C" },
  porosity: { label: "analysis.p_porosity", unit: "", unitKey: "analysis.u_fraction" },
  acid_concentration: { label: "analysis.p_acid_concentration", unit: "w/w" },
  wellbore_diameter: { label: "analysis.p_wellbore_diameter", unit: "in" },
  payzone_thickness: { label: "analysis.p_payzone_thickness", unit: "ft" },
};

export function analysisAxis(sweepParam: string | undefined, t: TFn): { label: string; unit: string } {
  const meta = sweepParam ? ANALYSIS_META[sweepParam] : undefined;
  if (!meta) return { label: t("analysis.p_value"), unit: "" };
  return { label: t(meta.label), unit: meta.unitKey ? t(meta.unitKey) : meta.unit };
}

const fmtNum = (x: number) => String(Number(x.toPrecision(6)));

export interface AnalysisRow {
  x: number;
  q_opt: number | null;
  v_opt: number | null;
  tbt_min: number | null;
  nota: string;
}

export function buildAnalysisRows(a: AnalysisTableInput, t: TFn): AnalysisRow[] {
  const unit = analysisAxis(a.sweepParam, t).unit;
  const isTemp = a.sweepParam === "temperature";
  // T_CALIBRATED_K (Kelvin) is the internal source of truth, and the outside/skipped
  // membership checks below compare against the RAW Kelvin sweep values the backend
  // returned -- never a converted one. Only the DISPLAYED row.x and note text convert, via
  // formatSweepX (row.x, shared with the Analysis chart) or plain kelvinToCelsius (note text,
  // which has its own 6-significant-figure formatter, fmtNum, below).
  const toRowX = (x: number) => formatSweepX(x, a.sweepParam);
  const toNoteX = (x: number) => (isTemp ? kelvinToCelsius(x) : x);
  const outside = new Set(a.outsideCalibratedRange);
  const rows = a.sweepValues.map((x, i) => {
    const notes: string[] = [];
    if (outside.has(x)) {
      const [lo, hi] = isTemp ? T_CALIBRATED_C : T_CALIBRATED_K;
      notes.push(t("analysis.note_outside", { lo, hi }));
    }
    const q: number | null = a.optimumRate[i];
    const v: number | null = a.optimumVolume[i];
    return { x: toRowX(x), q_opt: q, v_opt: v, tbt_min: q && v != null ? v / q : null, notes };
  });
  if (a.hasClippedVolume && a.firstClippedValue != null && rows.length) {
    rows[rows.length - 1].notes.push(t("analysis.note_clipped", { x: fmtNum(toNoteX(a.firstClippedValue)), unit }));
  }
  const skipped = a.skippedValues.map((x) => ({
    x: toRowX(x), q_opt: null as number | null, v_opt: null as number | null, tbt_min: null as number | null,
    notes: [t("analysis.note_skipped")],
  }));
  return [...rows, ...skipped]
    .sort((p, q) => p.x - q.x)
    .map(({ notes, ...r }) => ({ ...r, nota: notes.join("; ") }));
}

export function buildAnalysisTable(
  a: AnalysisTableInput | null,
  t: TFn
): { columns: ColumnConfig[]; rows: Record<string, any>[]; isHighlighted: (row: Record<string, any>) => boolean } {
  const { label, unit } = analysisAxis(a?.sweepParam, t);
  const columns: ColumnConfig[] = [
    { key: "x", label, unit: unit || undefined, description: t("analysis.d_x") },
    { key: "q_opt", label: "q_opt", unit: "gal/(ft.min)", description: t("analysis.d_qopt") },
    { key: "V_opt", label: "V_opt", unit: "gal/ft", description: t("analysis.d_vopt") },
    { key: "tbt_min", label: "tbt", unit: "min", description: t("analysis.d_tbt") },
    { key: "nota", label: t("col.note"), description: t("analysis.d_note"), format: (v) => v || "" },
  ];
  const rows = a
    ? buildAnalysisRows(a, t).map((r) => ({ x: r.x, q_opt: r.q_opt, V_opt: r.v_opt, tbt_min: r.tbt_min, nota: r.nota }))
    : [];
  return { columns, rows, isHighlighted: (row) => !!row.nota };
}
