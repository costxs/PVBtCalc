import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../redux/store";
import { useEffect, useState } from "react";
import { removeCurve } from "../redux/storageresults/slice";
import exportCurveAsVerticalTable from "../tools/export";
import type { Curve } from '../redux/storageresults/slice'
import { pointSeverity, SEVERITY_COLORS } from "../tools/pointSeverity";
import DataTable from "./DataTable";
import { buildSimulationTable, buildSkinTable, buildDesignTable } from "./columnsConfig";
import { matchesFlowRegime } from "../tools/regimeFilter";

const MARK_ERROR = SEVERITY_COLORS.error;
const MARK_WARN = SEVERITY_COLORS.warn;

/**
 * UNICO ponto que renderiza o marcador de severidade de um ponto da curva
 * radial (Fase 4). A regra de combinacao status + withinValidity vive em
 * tools/pointSeverity.ts (testavel sem DOM) -- aqui so o visual:
 *   - ERRO   -> triangulo vermelho SOLIDO (tem que vencer a disputa de atencao)
 *   - ATENCAO -> circulo ambar de CONTORNO fino (caso comum: nao pode competir)
 *   - nada   -> null
 */
function PointMarker({ status, withinValidity }: { status?: string; withinValidity?: boolean }) {
  const { level, tooltip } = pointSeverity(status, withinValidity);
  if (level === 'none') return null;

  if (level === 'error') {
    return (
      <span title={tooltip} aria-label={tooltip}
        style={{ color: MARK_ERROR, fontWeight: 700, marginRight: '5px', cursor: 'help', verticalAlign: 'middle' }}>
        &#9650;
      </span>
    );
  }
  return (
    <span title={tooltip} aria-label={tooltip}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '12px', height: '12px', marginRight: '5px', cursor: 'help', verticalAlign: 'middle',
        border: `1px solid ${MARK_WARN}`, borderRadius: '50%',
        color: MARK_WARN, fontSize: '9px', lineHeight: 1, fontWeight: 600,
      }}>
      !
    </span>
  );
}

export default function ResultTab() {
  const dispatch = useDispatch();
  const { ids, curves } = useSelector((state: RootState) => state.resultCurves)
  const visibleChart = useSelector((state: RootState) => state.ui.visibleChart);
  const { flowRegime, skinEvolutionData, designPlotData, payzoneThickness } = useSelector((state: RootState) => state.radial);

  // Bug (2026-09): o dropdown "Saved run" listava TODOS os ids salvos, sem
  // olhar o regime de origem de cada curva (Curve.flowRegime) -- ao trocar
  // de aba (ou recarregar a pagina, que restaura curvas mas nao sempre
  // sincroniza com a curva ativa) uma curva radial podia ficar selecionada
  // com a UI em modo Linear e vice-versa. flowRegime ausente = curva salva
  // antes do campo existir (legado), tratada como linear.
  const regimeIds = ids.filter((id) => {
    const c = (curves as any).find((cur: Curve) => cur.id === id);
    return matchesFlowRegime(c?.flowRegime, flowRegime);
  });

  const [selectedId, setSelectedId] = useState(regimeIds.length > 0 ? regimeIds[0] : "");
  const [curve, setCurve] = useState<Curve | null>(null)

  const handleDelete = () => {
    dispatch(removeCurve(selectedId));
    setSelectedId(regimeIds[0] || "");
  }

  const handleCurve = (id: any) => {
    setCurve((curves as any).find((c: Curve) => c.id === id) || null);
  }

  useEffect(() => {
    const lastId = regimeIds[regimeIds.length - 1];
    setSelectedId(lastId ?? "");
    handleCurve(lastId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowRegime, ids]);

  // Fase 8: qual aba de grafico esta ativa decide a fonte de dados/colunas
  // da tabela -- design/skin so existem quando flowRegime === 'radial'
  // (os radios daquelas abas nem aparecem no linear, Chart.tsx:800), a
  // guarda aqui e so defensiva contra um visibleChart parado de uma troca
  // de regime anterior.
  const isSkinTab = flowRegime === 'radial' && visibleChart === 'skin';
  const isDesignTab = flowRegime === 'radial' && visibleChart === 'design';
  const isCurveTab = !isSkinTab && !isDesignTab;

  const simTable = isCurveTab ? buildSimulationTable(curve) : null;
  const skinTable = isSkinTab ? buildSkinTable(skinEvolutionData) : null;
  const designTable = isDesignTab ? buildDesignTable(designPlotData, payzoneThickness) : null;

  const table = simTable || skinTable || designTable!;
  const acid = (curve as any)?.acid || '';
  const rock = (curve as any)?.rock || '';

  // Painel de resumo (Min PVBt/volume) so faz sentido para a aba de curva
  // salva (Simulation/Analysis) -- Skin/Design nao tem "otimo" definido
  // pelo pedido desta etapa. optimumField vem de buildSimulationTable (uma
  // so fonte para essa decisao -- nao recalcular isVolumeMode aqui).
  const optimumField = simTable?.optimumField ?? null;
  const optimumValues = simTable && optimumField ? simTable.rows.map((r) => r[optimumField]).filter((v) => v != null) : [];
  const minOptimumValue = optimumValues.length > 0 ? Math.min(...optimumValues) : null;

  return (
    <section className="blueprint" style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
        <span className="secnum">05</span>
        <h5 style={{ margin: 0, fontSize: '18px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          {isSkinTab ? 'Skin Evolution Table' : isDesignTab ? 'Design Plot Table' : 'Optimum Parameters'}
        </h5>
        <span style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }}></span>
      </div>

      {isCurveTab && (
        <div className="flex flex-col xl:grid xl:grid-cols-2 gap-[22px] items-start">
          <div>
            <div className="field" style={{ marginBottom: '10px' }}>
              <label>Saved run</label>
              <select className="input" value={selectedId} onChange={(e) => { handleCurve(e.target.value); setSelectedId(e.target.value) }}>
                {regimeIds.length === 0 && <option>No saved runs yet</option>}
                {regimeIds.map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-green" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: '9px', padding: '9px 18px' }} onClick={curve ? () => exportCurveAsVerticalTable(curve) : () => null}>Export</button>
              <button className="btn btn-red" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: '9px', padding: '9px 18px' }} onClick={handleDelete}>Delete</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px', fontSize: '13px' }}>
            <span className="text-muted" style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Acid system</span>
            <span>{acid || '...'}</span>
            <span className="text-muted" style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Rock type</span>
            <span>{rock || '...'}</span>
            <span className="text-muted" style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {optimumField === 'V_A' ? `Min acid volume (${simTable?.columns.find((c) => c.key === 'V_A')?.unit ?? 'gal'})` : 'Pore volume to bt'}
            </span>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: 'var(--color-accent-700)', lineHeight: '1.1' }}>
              {minOptimumValue != null ? Number(minOptimumValue).toFixed(4) : '-'}
            </span>
            {curve?.flowratePoints && curve.flowratePoints.length > 0 && (
              <>
                <span className="text-muted" style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Flowrate sweep</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', color: 'var(--color-accent-800)', alignSelf: 'center' }}>
                  {Math.min(...curve.flowratePoints).toFixed(3)} – {Math.max(...curve.flowratePoints).toFixed(3)} {curve.flowRegime === 'radial' ? 'gal/(ft.min)' : 'cm³/min'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto', overflowY: 'auto', marginTop: '18px', flex: 1, minHeight: 0 }}>
        <DataTable
          columns={table.columns}
          rows={table.rows}
          markerColumnKey={simTable?.markerColumnKey}
          renderMarker={simTable ? (row) => <PointMarker status={row.__status} withinValidity={row.__withinValidity} /> : undefined}
          isHighlighted={simTable?.isHighlighted}
        />
      </div>
    </section>
  )
}
