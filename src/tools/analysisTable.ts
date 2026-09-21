import type { ColumnConfig } from "../components/DataTable";
import { T_CALIBRATED_K } from "./sweepValidation";

// Espelho de _analysis_rows (PVBtCalc-Back/app/services/export_workbook.py) --
// linhas e Nota (PT) travadas por shared-fixtures/radial_analysis_table_cases.json.

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

export type NoteLang = "pt" | "en";

// [rotulo, unidade] -- mesma convencao do Design Plot (rotulos em minusculas).
export const ANALYSIS_META: Record<string, [string, string]> = {
  temperature: ["temperatura", "K"],
  porosity: ["porosidade", "fração"],
  acid_concentration: ["concentração", "w/w"],
  wellbore_diameter: ["diâmetro do poço", "in"],
  payzone_thickness: ["espessura", "ft"],
};

const fmtNum = (x: number) => String(Number(x.toPrecision(6)));

const NOTES = {
  pt: {
    outside: (lo: number, hi: number) => `Fora da faixa calibrada (${lo}–${hi} K)`,
    skipped: () => "Sem ótimo interior — ponto omitido",
    clipped: (x: string, unit: string) => `Série truncada — ${x} ${unit} excede o limite de 1000 gal/ft`,
  },
  en: {
    outside: (lo: number, hi: number) => `Outside calibrated range (${lo}–${hi} K)`,
    skipped: () => "No interior optimum — point omitted",
    clipped: (x: string, unit: string) => `Series truncated — ${x} ${unit} exceeds the 1000 gal/ft limit`,
  },
};

export interface AnalysisRow {
  x: number;
  q_opt: number | null;
  v_opt: number | null;
  tbt_min: number | null;
  nota: string;
}

export function buildAnalysisRows(a: AnalysisTableInput, lang: NoteLang = "pt"): AnalysisRow[] {
  const unit = ANALYSIS_META[a.sweepParam]?.[1] ?? "";
  const t = NOTES[lang];
  const outside = new Set(a.outsideCalibratedRange);
  const rows = a.sweepValues.map((x, i) => {
    const notes: string[] = [];
    if (outside.has(x)) notes.push(t.outside(T_CALIBRATED_K[0], T_CALIBRATED_K[1]));
    const q: number | null = a.optimumRate[i];
    const v: number | null = a.optimumVolume[i];
    return { x, q_opt: q, v_opt: v, tbt_min: q && v != null ? v / q : null, notes };
  });
  if (a.hasClippedVolume && a.firstClippedValue != null && rows.length) {
    rows[rows.length - 1].notes.push(t.clipped(fmtNum(a.firstClippedValue), unit));
  }
  const skipped = a.skippedValues.map((x) => ({
    x, q_opt: null as number | null, v_opt: null as number | null, tbt_min: null as number | null, notes: [t.skipped()],
  }));
  return [...rows, ...skipped]
    .sort((p, q) => p.x - q.x)
    .map(({ notes, ...r }) => ({ ...r, nota: notes.join("; ") }));
}

export function buildAnalysisTable(
  a: AnalysisTableInput | null,
  lang: NoteLang = "pt"
): { columns: ColumnConfig[]; rows: Record<string, any>[]; isHighlighted: (row: Record<string, any>) => boolean } {
  const [label, unit] = (a && ANALYSIS_META[a.sweepParam]) || ["valor", ""];
  const columns: ColumnConfig[] = [
    { key: "x", label, unit: unit || undefined, description: "Swept parameter value — matches the chart X axis" },
    { key: "q_opt", label: "q_opt", unit: "gal/(ft.min)", description: "Optimum injection rate at the target length — matches the chart (left axis)" },
    { key: "V_opt", label: "V_opt", unit: "gal/ft", description: "Acid volume at optimum injection rate — matches the chart (right axis)" },
    { key: "tbt_min", label: "tbt", unit: "min", description: "Pumping time at optimum rate = V_opt / q_opt — plain time, not per ft: the /ft in both inputs cancels out (same as the Design Plot table)" },
    { key: "nota", label: "Nota", description: "Rows truncated by the 1000 gal/ft ceiling, outside the calibrated temperature range, or with no interior optimum", format: (v) => v || "" },
  ];
  const rows = a
    ? buildAnalysisRows(a, lang).map((r) => ({ x: r.x, q_opt: r.q_opt, V_opt: r.v_opt, tbt_min: r.tbt_min, nota: r.nota }))
    : [];
  return { columns, rows, isHighlighted: (row) => !!row.nota };
}
