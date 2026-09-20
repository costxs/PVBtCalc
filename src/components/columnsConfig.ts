import { ColumnConfig } from "./DataTable";

export function buildSimulationTable(curve: any): { columns: ColumnConfig[]; rows: Record<string, any>[]; markerColumnKey?: string; isHighlighted: (row: Record<string, any>, i: number) => boolean; optimumField: 'PVBt' | 'V_A' } {
  const isRadial = curve?.flowRegime === 'radial';
  const isVolumeMode = isRadial && curve?.outputMode === 'volume';
  const flowratePoints: number[] = curve?.flowratePoints || [0];

  const columns: ColumnConfig[] = [];
  if (isRadial) {
    columns.push({ key: 'q0', label: 'q0', unit: 'gal/(ft.min)', description: 'flowrate, normalized per ft of payzone — matches the chart X axis' });
    columns.push({ key: 'V_A', label: 'V_A', unit: 'gal/ft', description: 'Acid Volume to Breakthrough, normalized per ft of payzone — matches the chart Y axis' });
    if (curve?.targetLabel) columns.push({ key: 'target', label: 'target', description: 'Target penetration / skin for this curve', format: (v) => v ?? '-' });
    columns.push({ key: 'iv', label: 'iv', unit: 'm/s', description: 'Intersticial Velocity (m/s)' });
    columns.push({ key: 'wv', label: 'wv', unit: 'm/s', description: 'Fluid Velocity in the Wormhole (m/s), at the wellbore face (λ=0) — same convention as the linear model; NOT evaluated at this curve’s target like the 1/Da column' });
    columns.push({ key: 'dv', label: 'dv', unit: 'm/s', description: 'Darcy Velocity (m/s)' });
    columns.push({ key: 'invDa', label: '1/Da', description: 'Damkholer Number Inverse (dimensionless), evaluated at this curve’s target penetration — so it differs between targets at the same flowrate (unlike wv, which is the wellbore-face value)' });
    columns.push({ key: 'tbt', label: 'tbt', unit: 's', description: 'Time to Breakthrough (s)' });
    if (!isVolumeMode) columns.push({ key: 'PVBt', label: 'PVBt', description: 'Pore Volume to Breakthrough (dimensionless)' });
  } else {
    columns.push({ key: 'q0', label: 'q0', unit: 'cm³/min', description: 'flowrate (cm³/min)' });
    if (isVolumeMode) {
      columns.push({ key: 'V_A', label: 'V_A', unit: 'gal', description: 'Acid Volume to Breakthrough, absolute (gal) — no drainage radius was set' });
    } else {
      columns.push({ key: 'PVBt', label: 'PVBt', description: 'Pore Volume to Breakthrough (dimensionless)' });
    }
    columns.push({ key: 'iv', label: 'iv', unit: 'm/s', description: 'Intersticial Velocity (m/s)' });
    columns.push({ key: 'invDa', label: '1/Da', description: 'Damkholer Number Inverse (dimensionless)' });
    columns.push({ key: 'wv', label: 'wv', unit: 'm/s', description: 'Fluid Velocity in the Wormhole (m/s)' });
    columns.push({ key: 'vbt', label: 'vbt', unit: 'cm³', description: 'Acid Volume to Breakthrough (cm³)' });
    columns.push({ key: 'tbt', label: 'tbt', unit: 's', description: 'Time to Breakthrough (s)' });
    columns.push({ key: 'dv', label: 'dv', unit: 'm/s', description: 'Darcy Velocity (m/s)' });
  }

  const rows = flowratePoints.map((q0: number, i: number) => ({
    q0,
    V_A: curve?.acidVolumePoints?.[i] ?? null,
    target: curve?.targetLabel,
    PVBt: curve?.pvbtPoints?.[i] ?? null,
    iv: curve?.intersticialVelocity?.[i] ?? null,
    invDa: curve?.iDa?.[i] ?? null,
    wv: curve?.wormholeVelocity?.[i] ?? null,
    vbt: curve?.volumeToBt?.[i] ?? null,
    tbt: curve?.timeToBt?.[i] ?? null,
    dv: curve?.darcyVelocity?.[i] ?? null,
    __status: curve?.statusPoints?.[i],
    __withinValidity: curve?.withinValidityRange?.[i],
  }));

  const optimumField = isVolumeMode ? 'V_A' : 'PVBt';
  const optimumValues = rows.map((r) => r[optimumField]).filter((v) => v != null);
  const minOptimum = optimumValues.length > 0 ? Math.min(...optimumValues) : null;
  const minIndex = minOptimum != null ? rows.findIndex((r) => r[optimumField] === minOptimum) : -1;

  return {
    columns,
    rows,
    markerColumnKey: 'q0',
    isHighlighted: (_row, i) => i === minIndex && i !== 0,
    optimumField,
  };
}

export function buildSkinTable(skinEvolutionData: Record<string, { x: number; y: number; l_ft: number }[]>): { columns: ColumnConfig[]; rows: Record<string, any>[] } {
  const columns: ColumnConfig[] = [
    { key: 'V_A', label: 'V_A', unit: 'gal/ft', description: 'Acid Volume to Breakthrough, normalized per ft of payzone — matches the chart X axis' },
    { key: 'skin', label: 'skin', description: 'Equivalent skin — matches the chart Y axis', format: (v) => (v == null ? '-' : Number(v).toFixed(3)) },
    { key: 'comprimento', label: 'comprimento', unit: 'ft', description: 'Wormhole length swept for this point' },
    { key: 'q0', label: 'q0 (input)', unit: 'bbl/min', description: 'Input flowrate that defines this curve (not a per-point value) — stays in bbl/min like the input and the chart legend; not comparable to the q0 column in the Simulation tab, which is gal/(ft·min)' },
  ];

  const rows = Object.entries(skinEvolutionData).flatMap(([q0Str, points]) =>
    points.map((p) => ({ V_A: p.x, skin: p.y, comprimento: p.l_ft, q0: Number(q0Str) }))
  );

  return { columns, rows };
}

export function buildDesignTable(
  designPlotData: { series: { temperature_k: number, optimum_rate_series: number[][]; optimum_volume_series: number[][] }[] } | null,
  payzoneThicknessFt?: number | null
): { columns: ColumnConfig[]; rows: Record<string, any>[] } {
  const columns: ColumnConfig[] = [
    { key: 'comprimento', label: 'comprimento', unit: 'ft', description: 'Wormhole length target' },
    { key: 'q_opt', label: 'q_opt', unit: 'gal/(ft.min)', description: 'Optimum injection rate for this length — matches the chart' },
    { key: 'V_opt', label: 'V_opt', unit: 'gal/ft', description: 'Acid volume at optimum injection rate for this length — matches the chart' },
    { key: 'tbt_min', label: 'tbt', unit: 'min', description: 'Pumping time at optimum rate = V_opt / q_opt — plain time, not per ft: the /ft in both inputs cancels out' },
    { key: 'volume_total', label: 'volume_total', unit: 'gal', description: 'Total acid volume at optimum = V_opt x payzone thickness — the absolute volume to purchase/stock; equals V_opt only when payzone thickness = 1 ft' },
    { key: 'temperatura', label: 'temperatura', unit: 'K', description: 'System temperature for this curve' },
  ];

  const rows: Record<string, any>[] = [];

  if (designPlotData && designPlotData.series) {
    for (const s of designPlotData.series) {
      const rate = s.optimum_rate_series || [];
      const volume = s.optimum_volume_series || [];
      const n = Math.min(rate.length, volume.length);
      for (let i = 0; i < n; i++) {
        const q_opt = rate[i][0];
        const V_opt = volume[i][0];
        rows.push({
          comprimento: rate[i][1],
          q_opt,
          V_opt,
          tbt_min: q_opt ? V_opt / q_opt : null,
          volume_total: payzoneThicknessFt != null ? V_opt * payzoneThicknessFt : null,
          temperatura: s.temperature_k
        });
      }
    }
  }

  rows.sort((a, b) => a.comprimento - b.comprimento);

  return { columns, rows };
}
