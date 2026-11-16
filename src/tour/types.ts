/** Aba de gráfico que um passo abre antes de posicionar o destaque. */
export type ChartView =
  | "lsim"  // linear — Simulation Chart
  | "lana"  // linear — Analysis Chart
  | "rsim"  // radial — Simulation Chart
  | "rdes"  // radial — Design Plot
  | "rana"  // radial — Analysis Chart
  | "rskin"; // radial — Skin Evolution

export type TourTrack = "linear" | "radial" | "export";

export interface TourStep {
  /** estável: nome do passo (e futura chave de i18n) */
  id: string;
  /** data-tour do elemento destacado; null = balão centralizado, sem destaque */
  anchor: string | null;
  title: string;
  body: string;
  chart?: ChartView;
  /** alvo reserva quando o elemento só existe depois do cálculo (ou ainda está carregando) */
  fallback?: string;
  /** frase acrescentada ao texto enquanto o destaque está no alvo reserva */
  fallbackNote?: string;
}

export interface TourDefinition {
  track: TourTrack;
  initialChart: ChartView | null;
  steps: TourStep[];
}

/** valor de ui.visibleChart para cada aba */
export const CHART_VIEW_TO_VISIBLE: Record<ChartView, string> = {
  lsim: "A",
  lana: "B",
  rsim: "A",
  rdes: "design",
  rana: "B",
  rskin: "skin",
};
