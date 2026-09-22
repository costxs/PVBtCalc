import { ColumnConfig } from "./DataTable";
import type { TFn } from "../i18n";
import { roundCelsius } from "../tools/temperature";

export function buildSimulationTable(curve: any, t: TFn): { columns: ColumnConfig[]; rows: Record<string, any>[]; markerColumnKey?: string; isHighlighted: (row: Record<string, any>, i: number) => boolean; optimumField: 'PVBt' | 'V_A' } {
  const isRadial = curve?.flowRegime === 'radial';
  const isVolumeMode = isRadial && curve?.outputMode === 'volume';
  const flowratePoints: number[] = curve?.flowratePoints || [0];

  const columns: ColumnConfig[] = [];
  if (isRadial) {
    columns.push({ key: 'q0', label: 'q0', unit: 'gal/(ft.min)', description: t('col.d_q0_radial') });
    columns.push({ key: 'V_A', label: 'V_A', unit: 'gal/ft', description: t('col.d_va_radial') });
    if (curve?.targetLabel) columns.push({ key: 'target', label: t('col.target'), description: t('col.d_target'), format: (v) => v ?? '-' });
    columns.push({ key: 'iv', label: 'iv', unit: 'm/s', description: t('col.d_iv') });
    columns.push({ key: 'wv', label: 'wv', unit: 'm/s', description: t('col.d_wv_radial') });
    columns.push({ key: 'dv', label: 'dv', unit: 'm/s', description: t('col.d_dv') });
    columns.push({ key: 'invDa', label: '1/Da', description: t('col.d_invda_radial') });
    columns.push({ key: 'tbt', label: 'tbt', unit: 's', description: t('col.d_tbt') });
    if (!isVolumeMode) columns.push({ key: 'PVBt', label: 'PVBt', description: t('col.d_pvbt') });
  } else {
    columns.push({ key: 'q0', label: 'q0', unit: 'cm³/min', description: t('col.d_q0_linear') });
    if (isVolumeMode) {
      columns.push({ key: 'V_A', label: 'V_A', unit: 'gal', description: t('col.d_va_abs') });
    } else {
      columns.push({ key: 'PVBt', label: 'PVBt', description: t('col.d_pvbt') });
    }
    columns.push({ key: 'iv', label: 'iv', unit: 'm/s', description: t('col.d_iv') });
    columns.push({ key: 'invDa', label: '1/Da', description: t('col.d_invda_linear') });
    columns.push({ key: 'wv', label: 'wv', unit: 'm/s', description: t('col.d_wv_linear') });
    columns.push({ key: 'vbt', label: 'vbt', unit: 'cm³', description: t('col.d_vbt') });
    columns.push({ key: 'tbt', label: 'tbt', unit: 's', description: t('col.d_tbt') });
    columns.push({ key: 'dv', label: 'dv', unit: 'm/s', description: t('col.d_dv') });
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

export function buildSkinTable(skinEvolutionData: Record<string, { x: number; y: number; l_ft: number }[]>, t: TFn): { columns: ColumnConfig[]; rows: Record<string, any>[] } {
  const columns: ColumnConfig[] = [
    { key: 'V_A', label: 'V_A', unit: 'gal/ft', description: t('col.d_va_skin') },
    { key: 'skin', label: t('col.skin'), description: t('col.d_skin'), format: (v) => (v == null ? '-' : Number(v).toFixed(3)) },
    // Explicit 2-decimal format: the swept length grid is fine (fractions of a ft), and without
    // this the generic DataTable defaultFormat's zero-branch ("0" with no decimals for an exact
    // 0) plus rounding elsewhere in the pipeline could read as a coarse, repeating integer grid
    // instead of the real one -- same "ft length" precision as the target/design-note convention.
    { key: 'wormhole_length', label: t('col.wormhole_length'), unit: 'ft', description: t('col.d_wl_swept'), format: (v) => (v == null ? '-' : Number(v).toFixed(2)) },
    { key: 'q0', label: t('col.q0_input'), unit: 'bbl/min', description: t('col.d_q0_input') },
  ];

  const rows = Object.entries(skinEvolutionData).flatMap(([q0Str, points]) =>
    points.map((p) => ({ V_A: p.x, skin: p.y, wormhole_length: p.l_ft, q0: Number(q0Str) }))
  );

  return { columns, rows };
}

export function buildDesignTable(
  designPlotData: { series: { temperature_k: number, optimum_rate_series: number[][]; optimum_volume_series: number[][] }[] } | null,
  payzoneThicknessFt: number | null | undefined,
  t: TFn
): { columns: ColumnConfig[]; rows: Record<string, any>[] } {
  const columns: ColumnConfig[] = [
    { key: 'wormhole_length', label: t('col.wormhole_length'), unit: 'ft', description: t('col.d_wl_target'), format: (v) => (v == null ? '-' : Number(v).toFixed(2)) },
    { key: 'q_opt', label: 'q_opt', unit: 'gal/(ft.min)', description: t('col.d_qopt') },
    { key: 'V_opt', label: 'V_opt', unit: 'gal/ft', description: t('col.d_vopt') },
    { key: 'tbt_min', label: 'tbt', unit: 'min', description: t('col.d_tbt_min') },
    { key: 'volume_total', label: t('col.volume_total'), unit: 'gal', description: t('col.d_vtotal') },
    { key: 'temperature', label: t('col.temperature'), unit: '°C', description: t('col.d_temperature') },
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
          wormhole_length: rate[i][1],
          q_opt,
          V_opt,
          tbt_min: q_opt ? V_opt / q_opt : null,
          volume_total: payzoneThicknessFt != null ? V_opt * payzoneThicknessFt : null,
          temperature: roundCelsius(s.temperature_k, 2)
        });
      }
    }
  }

  rows.sort((a, b) => a.wormhole_length - b.wormhole_length);

  return { columns, rows };
}
