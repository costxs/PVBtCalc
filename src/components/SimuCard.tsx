import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { setParameter, resetParameter, setGeometry } from "../redux/setup/slice";
import { fetchCurve, setId, setSystem, setOthers } from "../redux/results/slice";
import { addCurve } from "../redux/storageresults/slice";
import { fetchParam } from "../redux/parameters/slice";
import { useEffect, useState } from "react";
import {
  fetchRadialCurve,
  fetchSkinEvolution,
  setFlowRegime,
  setRadialGeometry,
  setTargetMode,
  addTarget,
  removeTarget,
  resetRadial,
  addSkinFlowrate,
  removeSkinFlowrate,
  setLastRunState,
  setRadialTemperatureK,
  addDesignTemperature,
  removeDesignTemperature,
  type WellboreSizeMode,
  type TargetMode,
} from "../redux/radial/slice";
import { setVisibleChart } from "../redux/ui/slice";
import { computeBeta, formatTargets, parseTargetInput } from "../redux/radial/targetConversion";
// Formatacao adaptativa de vazao (casas decimais por faixa) para o texto de
// ajuda da janela de validade. Nome herdado da Fase 3 (bbl/min), mas o corpo
// e agnostico de unidade -- Fase 6 reusa para cm3/min no ramo linear. Fase 7
// unifica quando o grafico/banner do linear entrar.
import { fmtBblMin } from "../tools/validityWindow";

const LINEAR_FLOWRATE_DEFAULTS = { min: 0.5, max: 10 };
const RADIAL_FLOWRATE_DEFAULTS = { min: 0.1, max: 5 };

export default function SimuSetupCard() {
  const setup = useSelector((state: RootState) => state.setup)
  const { flowrate: iflowrate, minimum_flowrate: fflowrate, acid_concentration: aConcentration, temperature, acid_type: acidType, step_numbers, id, rock_type, core_porosity, core_length, core_diameter } = setup;
  const dataCurve = useSelector((state: RootState) => state.results)
  const radialState = useSelector((state: RootState) => state.radial)
  // f (flowing fraction) so chega aqui via /pvbtradialcurve.parameters,
  // consumido por parameters/slice.tsx (state.parameters) -- nunca em
  // radialState.curves[i].metadata (esse e a janela de validade).
  const radialParameters = useSelector((state: RootState) => state.parameters)
  const visibleChart = useSelector((state: RootState) => state.ui.visibleChart);
  const { flowRegime, wellboreSize, wellboreSizeMode, payzoneThickness, drainageRadius, targetMode, targetsLambda, skinFlowrates, radialTemperatureK, designTemperatures } = radialState;
  const wellboreRadiusIn = wellboreSizeMode === 'diameter' ? wellboreSize / 2 : wellboreSize;
  const beta = computeBeta(wellboreRadiusIn);
  const targetChips = formatTargets(targetsLambda, targetMode, { beta });

  // O bloco de janela de validade (Fase 3) cita rotulos de alvo especificos
  // (ex. "5.00 ft"). radialState.curves so e substituido num novo Calculate --
  // mexer nos chips NAO limpa. Entao gatilhamos a exibicao comparando o
  // CONJUNTO de rotulos calculados com o dos chips atuais: alvo trocado/
  // removido/adicionado => conjuntos diferem => bloco some (nao cita rotulo
  // de chip que nao existe mais). Comparacao ordenada (nao join na ordem de
  // exibicao) para que uma futura reordenacao de chips -- mesmos alvos, dado
  // 100% valido -- nao faca o bloco piscar. sort() preserva multiplicidade
  // (alvos duplicados), Set nao. Dado stale de VALOR e aceitavel; rotulo
  // stale nao e.
  const sortedLabelKey = (labels: string[]) => [...labels].sort().join('|');
  const computedTargetKey = sortedLabelKey(radialState.curves.map((c) => c.target_label));
  const currentTargetKey = sortedLabelKey(
    targetChips.map((chip) =>
      targetMode === 'length' ? `${chip.label.toFixed(2)} ft` : `skin ${chip.label.toFixed(2)}`
    )
  );
  const validityBlockFresh =
    flowRegime === 'radial' &&
    radialState.processed &&
    radialState.curves.length > 0 &&
    computedTargetKey === currentTargetKey;

  const dispatch = useDispatch()
  const { ids } = useSelector((state: RootState) => state.resultCurves)
  const [newTarget, setNewTarget] = useState('');
  const [targetError, setTargetError] = useState('');
  const [newSkinFlowrate, setNewSkinFlowrate] = useState('');
  const [skinFlowrateError, setSkinFlowrateError] = useState('');
  const [newDesignTemperature, setNewDesignTemperature] = useState('');
  const [designTemperatureError, setDesignTemperatureError] = useState('');

  const handleAddSkinFlowrate = () => {
    if (newSkinFlowrate.trim() === '' || Number.isNaN(Number(newSkinFlowrate))) { setSkinFlowrateError('Enter a numeric value.'); return; }
    if (skinFlowrates.length >= 6) { setSkinFlowrateError('Maximum of 6 flowrates.'); return; }
    const flowrate = Number(newSkinFlowrate);
    if (flowrate <= 0) { setSkinFlowrateError('Flowrate must be > 0.'); return; }
    if (skinFlowrates.includes(flowrate)) { setSkinFlowrateError('Flowrate already added.'); return; }
    dispatch(addSkinFlowrate(flowrate));
    setNewSkinFlowrate('');
    setSkinFlowrateError('');
  };

  const handleRemoveSkinFlowrate = (i: number) => {
    dispatch(removeSkinFlowrate(i));
  };

  const handleAddDesignTemperature = () => {
    if (newDesignTemperature.trim() === '' || Number.isNaN(Number(newDesignTemperature))) { setDesignTemperatureError('Enter a numeric value.'); return; }
    if (designTemperatures.length >= 6) { setDesignTemperatureError('Maximum of 6 temperatures.'); return; }
    const temp = Number(newDesignTemperature);
    if (temp < 283 || temp > 478) { setDesignTemperatureError('Must be between 283 and 478 K.'); return; }
    if (designTemperatures.includes(temp)) { setDesignTemperatureError('Temperature already added.'); return; }
    dispatch(addDesignTemperature(temp));
    setNewDesignTemperature('');
    setDesignTemperatureError('');
  };

  const handleRemoveDesignTemperature = (i: number) => {
    dispatch(removeDesignTemperature(i));
  };

  const handleFlowRegimeChange = (regime: 'linear' | 'radial') => {
    dispatch(setFlowRegime(regime));
    if (regime === 'radial') {
      dispatch(setVisibleChart('design'));
      if (Number(fflowrate) === LINEAR_FLOWRATE_DEFAULTS.min && Number(iflowrate) === LINEAR_FLOWRATE_DEFAULTS.max) {
        dispatch(setParameter({ key: 'minimum_flowrate', value: RADIAL_FLOWRATE_DEFAULTS.min }));
        dispatch(setParameter({ key: 'flowrate', value: RADIAL_FLOWRATE_DEFAULTS.max }));
      }
    } else if (regime === 'linear') {
      if (visibleChart === 'design' || visibleChart === 'skin') {
        dispatch(setVisibleChart('A'));
      }
      if (Number(fflowrate) === RADIAL_FLOWRATE_DEFAULTS.min && Number(iflowrate) === RADIAL_FLOWRATE_DEFAULTS.max) {
        dispatch(setParameter({ key: 'minimum_flowrate', value: LINEAR_FLOWRATE_DEFAULTS.min }));
        dispatch(setParameter({ key: 'flowrate', value: LINEAR_FLOWRATE_DEFAULTS.max }));
      }
    }
  };

  const handleRadialGeometry = (patch: Partial<{ wellboreSize: number; wellboreSizeMode: WellboreSizeMode; payzoneThickness: number; drainageRadius: number | null }>) => {
    dispatch(setRadialGeometry({ wellboreSize, wellboreSizeMode, payzoneThickness, drainageRadius, ...patch }));
  };

  const handleTargetMode = (mode: TargetMode) => {
    dispatch(setTargetMode(mode));
    setTargetError('');
  };

  const handleAddTarget = () => {
    if (newTarget.trim() === '' || Number.isNaN(Number(newTarget))) { setTargetError('Enter a numeric value.'); return; }
    if (targetMode === 'skin' && Number(newTarget) >= 0) { setTargetError('Skin targets must be < 0.'); return; }
    if (targetsLambda.length >= 6) { setTargetError('Maximum of 6 targets.'); return; }
    const lambda = parseTargetInput(newTarget, targetMode, { beta });
    if (lambda === null) { setTargetError(targetMode === 'length' ? 'Length targets must be > 0.' : 'Enter a numeric value.'); return; }
    dispatch(addTarget(lambda));
    setNewTarget('');
    setTargetError('');
  };

  const isIdUsed = Boolean(id) && ids.some(existingId => existingId === id || existingId.startsWith(`${id} · `));

  // Item 3 (cache/persistencia): antes isIdUsed BLOQUEAVA o calculo. Agora
  // so avisa -- calcular com um ID ja usado pergunta (window.confirm) se
  // quer sobrescrever a simulacao salva daquele ID; addCurve/upsertSnapshot
  // ja fazem upsert por id (idempotente), entao sobrescrever e seguro.
  const canCalculate = flowRegime === 'radial'
    ? Boolean(id) && targetsLambda.length > 0 && radialTemperatureK >= 283 && radialTemperatureK <= 478
    : Boolean(id);

  // Radial: depois de calcular, o botao vira "Calculated" (cinza, desabilitado)
  // ate o Simulation ID mudar. Guarda o ID do ultimo run; `processed` garante
  // que Reset (resetRadial) libere o botao de novo.
  const [radialCalculatedId, setRadialCalculatedId] = useState<string | null>(null);
  const radialAlreadyCalculated =
    flowRegime === 'radial' && radialState.processed && radialCalculatedId === id;

  const handleCurve = () => {
    if (radialAlreadyCalculated) return;
    if (isIdUsed && !window.confirm(`Já existe uma simulação salva com o ID "${id}". Sobrescrever com este novo cálculo?`)) {
      return;
    }
    if (flowRegime === 'radial') {
      if (!targetsLambda.length) { setTargetError('Provide at least one target penetration value.'); return; }
      setRadialCalculatedId(id);
      dispatch(setLastRunState({ setup, radial: radialState }));
      dispatch((fetchRadialCurve() as any));
      if (skinFlowrates.length > 0) {
        dispatch((fetchSkinEvolution() as any));
      }
      return;
    }
    dispatch(setId(id));
    dispatch(setSystem({ acid: acidType, rock: rock_type }))
    dispatch(setOthers(setup));
    dispatch((fetchCurve() as any));
    dispatch((fetchParam() as any));
  };

  const handleReset = () => {
    dispatch(resetParameter());
    dispatch(resetRadial());
    if (flowRegime === 'radial') {
      dispatch(setVisibleChart('design'));
    }
  }

  useEffect(() => {
    if (dataCurve.processed && dataCurve.id) {
      dispatch(addCurve(dataCurve));
    }
  }, [dataCurve.processed]);

  useEffect(() => {
    if (radialState.processed && id) {
      dispatch(setVisibleChart('design'));
      radialState.curves.forEach((c) => {
        dispatch(addCurve({
          id: `${id} · ${c.target_label}`,
          acid: acidType,
          rock: rock_type,
          porosity: core_porosity,
          concentration: aConcentration,
          // radialTemperatureK, NAO o `temperature` do setup linear (esse e
          // Celsius e so faz sentido pro modelo linear) -- era esse o field
          // que vazava "24.05" (default linear) pro export de uma curva
          // radial que na verdade rodou a 297+ K.
          temperature: radialTemperatureK,
          wellboreRadiusIn,
          payzoneThicknessFt: payzoneThickness,
          target: c.target,
          pvbtPoints: c.pvbtpoints,
          flowratePoints: c.flowratepoints,
          intersticialVelocity: c.insterticialvelocity,
          iDa: c.ida,
          volumeToBt: c.volumetobt,
          timeToBt: c.timetobt,
          wormholeVelocity: c.wormholevelocity,
          darcyVelocity: c.darcyvelocity,
          flowRegime: 'radial',
          targetLabel: c.target_label,
          outputMode: radialState.outputMode,
          acidVolumePoints: c.acidvolumepoints ?? undefined,
          statusPoints: c.status,
          withinValidityRange: c.within_validity_range,
          // Export (Fase "Exportar tudo") le q_opt daqui (readValidity) para
          // a nota de "minimo na borda" -- faltava aqui, export.tsx sempre
          // caia no fallback "nao disponivel".
          metadata: c.metadata,
          // Flowing Fraction (f): mesma logica do bug acima, mas para uma
          // chave que nunca existiu em metadata (so RadialCurveValidity).
          // Vem de state.parameters.f, resolvido pelo backend para o
          // rock_type deste request (get_adjusted_parameters).
          flowingFraction: radialParameters.f,
        }));
      });
    }
  }, [radialState.processed]);

  const handleParam = (dic: any) => {
    dispatch(setParameter(dic));
    if (temperature === 0 || aConcentration === 0) return;
    dispatch((fetchParam() as any));
  }

  const rockSrc = "/rockImages/" + (rock_type === "Indiana Limestone" ? "IndianaLimestone" : rock_type) + ".jpg";

  return (
    <>
      <section className="blueprint" id="runner" style={{ padding: '18px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
          <span className="secnum">01</span>
          <h5 style={{ margin: 0, fontSize: '18px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Run Setup</h5>
          <span style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }}></span>
        </div>

        <div className="seg" style={{ marginBottom: '16px' }}>
          <label className="seg-opt"><input type="radio" name="flow-regime" value="linear" checked={flowRegime === 'linear'} onChange={() => handleFlowRegimeChange('linear')} />Linear</label>
          <label className="seg-opt"><input type="radio" name="flow-regime" value="radial" checked={flowRegime === 'radial'} onChange={() => handleFlowRegimeChange('radial')} />Radial</label>
        </div>

        <div className="flex flex-col md:grid md:grid-cols-[96px_minmax(0,1fr)] gap-[18px] items-start">
          <figure className="blueprint duotone" style={{ width: '96px', height: '96px', margin: 0 }}>
            <img src={rockSrc} alt="Core sample" style={{ width: '110px', height: '93px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = '/rockImages/IndianaLimestone.jpg' }} />
          </figure>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[12px_14px]">
            <div className="field" style={{ gridColumn: 'span 3' }}>
              <label>Simulation ID</label>
              <input className="input" placeholder="1" value={id} onChange={(e) => dispatch(setParameter({ key: 'id', value: e.target.value }))} style={{ borderColor: isIdUsed ? '#c0392b' : undefined }} />
              {isIdUsed && <div style={{ color: '#c0392b', fontSize: '11.5px', marginTop: '4px' }}>Simulation ID "{id}" already exists — calculating will ask to overwrite it.</div>}
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Rock Type</label>
              <select className="input" value={rock_type} onChange={(e) => dispatch(setGeometry({ rock: e.target.value, length: core_length, diameter: core_diameter, porosity: core_porosity }))}>
                <option value="Indiana Limestone">Indiana Limestone</option>
                <option value="Desert Pink">Desert Pink</option>
                <option value="Edwards Yellow">Edwards Yellow</option>
                <option value="Edwards White">Edwards White</option>
                <option value="Austin Chalk">Austin Chalk</option>
                <option value="Winterest Limestone">Winterest Limestone</option>
              </select>
            </div>
            <div className="field">
              <label>Core Porosity <span className="text-muted">(fraction)</span></label>
              <input type="number" className="input" value={core_porosity} onChange={(e) => dispatch(setGeometry({ rock: rock_type, length: core_length, diameter: core_diameter, porosity: Number(e.target.value) }))} />
            </div>
            {flowRegime === 'linear' ? (
              <>
                <div className="field">
                  <label>Core Length <span className="text-muted">(in)</span></label>
                  <input type="number" className="input" value={core_length} onChange={(e) => dispatch(setGeometry({ rock: rock_type, length: Number(e.target.value), diameter: core_diameter, porosity: core_porosity }))} />
                </div>
                <div className="field">
                  <label>Core Diameter <span className="text-muted">(in)</span></label>
                  <input type="number" className="input" value={core_diameter} onChange={(e) => dispatch(setGeometry({ rock: rock_type, length: core_length, diameter: Number(e.target.value), porosity: core_porosity }))} />
                </div>
              </>
            ) : (
              <>
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>Wellbore Size <span className="text-muted">(in)</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 96px', gap: '6px' }}>
                    <input type="number" className="input" style={{ minWidth: 0 }} value={wellboreSize} onWheel={(e) => e.currentTarget.blur()} onChange={(e) => handleRadialGeometry({ wellboreSize: Number(e.target.value) })} />
                    <select className="input" value={wellboreSizeMode} onChange={(e) => handleRadialGeometry({ wellboreSizeMode: e.target.value as WellboreSizeMode })}>
                      <option value="diameter">Diameter</option>
                      <option value="radius">Radius</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Payzone Thickness <span className="text-muted">(ft)</span></label>
                  <input type="number" className="input" value={payzoneThickness} onChange={(e) => handleRadialGeometry({ payzoneThickness: Number(e.target.value) })} />
                </div>
              </>
            )}
            <div className="field">
              <label>System Temperature <span className="text-muted">({flowRegime === 'radial' ? 'K' : '°C'})</span></label>
              {flowRegime === 'radial' ? (
                <>
                  <input type="number" className="input" value={radialTemperatureK} onChange={(e) => dispatch(setRadialTemperatureK(Number(e.target.value)))} style={{ borderColor: (radialTemperatureK < 283 || radialTemperatureK > 478) ? '#c0392b' : undefined }} />
                  {(radialTemperatureK < 283 || radialTemperatureK > 478) && <div style={{ color: '#c0392b', fontSize: '11.5px', marginTop: '4px' }}>Must be between 283 and 478 K.</div>}
                </>
              ) : (
                <input type="number" className="input" value={temperature} onChange={(e) => handleParam({ key: 'temperature', value: Number(e.target.value) })} />
              )}
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Acid System</label>
              <select className="input" value={acidType} onChange={(e) => handleParam({ key: 'acid_type', value: e.target.value })}>
                <option value="HCl">HCl</option>
                <option value="HCl With Inhibitor Corrosion">HCl With Inhibitor Corrosion</option>
                <option value="HCl Emulsified">HCl Emulsified</option>
              </select>
            </div>
            <div className="field">
              <label>Acid Concentration <span className="text-muted">(w/w)</span></label>
              <input type="number" className="input" value={aConcentration} onChange={(e) => handleParam({ key: 'acid_concentration', value: Number(e.target.value) })} />
            </div>

            {flowRegime === 'radial' && (
              <div style={{ gridColumn: 'span 3' }}>
                <details>
                  <summary className="text-muted" style={{ cursor: 'pointer', fontSize: '12.5px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Advanced</summary>
                  <div className="field" style={{ marginTop: '10px', maxWidth: '260px' }}>
                    <label>Drainage Radius <span className="text-muted">(ft, optional)</span></label>
                    <input type="number" className="input" value={drainageRadius ?? ''} placeholder="omit to report acid volume instead of PVBt" onChange={(e) => handleRadialGeometry({ drainageRadius: e.target.value === '' ? null : Number(e.target.value) })} />
                  </div>
                  {(drainageRadius == null || drainageRadius <= 0) && (
                    <p className="text-muted" style={{ fontSize: '11.5px', margin: '6px 0 0' }}>No drainage radius set — results drop the PVBt column and report acid volume (gal/ft) instead; the optimum row is the one with the lowest acid volume.</p>
                  )}
                </details>
              </div>
            )}

            {flowRegime === 'radial' && (
              <div className="field" style={{ gridColumn: 'span 3' }}>
                <div className="seg" style={{ marginBottom: '10px' }}>
                  <label className="seg-opt"><input type="radio" name="target-mode" value="length" checked={targetMode === 'length'} onChange={() => handleTargetMode('length')} />Length</label>
                  <label className="seg-opt"><input type="radio" name="target-mode" value="skin" checked={targetMode === 'skin'} onChange={() => handleTargetMode('skin')} />Skin</label>
                </div>
                <label>Targets <span className="text-muted">({targetMode === 'length' ? 'ft' : 'dimensionless'})</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
                  {targetChips.map((chip, i) => (
                    <span key={i} className="tag tag-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {targetMode === 'length' ? `${chip.label} ft` : `skin: ${chip.label}`}
                      <button type="button" onClick={() => dispatch(removeTarget(i))} aria-label="Remove target" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                  {targetsLambda.length < 6 && (
                    <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                      <input type="number" className="input" style={{ width: '84px', minHeight: '28px', padding: '2px 6px' }} placeholder={targetMode === 'length' ? 'e.g. 10' : 'e.g. -4'} value={newTarget} onChange={(e) => setNewTarget(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTarget(); } }} />
                      <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }} onClick={handleAddTarget}>+ add</button>
                    </div>
                  )}
                </div>
                {targetError && <p style={{ color: '#c0392b', fontSize: '11.5px', margin: '6px 0 0' }}>{targetError}</p>}
              </div>
            )}
          </div>
        </div>

        {visibleChart !== 'skin' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px_20px] mt-[16px] pt-[16px] border-t border-[var(--color-divider)]">
            <div className="field">
              <label>Flowrate sweep <span className="text-muted">({flowRegime === 'radial' ? 'bbl/min' : 'cm³/min'})</span></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 14px 1fr', gap: '6px', alignItems: 'center' }}>
                <input type="number" className="input" value={fflowrate} onChange={(e) => dispatch(setParameter({ key: 'minimum_flowrate', value: e.target.value }))} />
                <span className="text-muted" style={{ textAlign: 'center', fontSize: '13px' }}>–</span>
                <input type="number" className="input" value={iflowrate} onChange={(e) => dispatch(setParameter({ key: 'flowrate', value: e.target.value }))} />
              </div>
              {flowRegime === 'radial' && payzoneThickness > 0 && Number.isFinite(Number(fflowrate)) && Number.isFinite(Number(iflowrate)) && (
                // Preview em tempo real (Fase 8): aritmetica pura sobre o que
                // esta digitado, sem esperar Calculate/backend -- por isso o
                // fator (bbl->gal, 42 exato, mesma constante de units.py) fica
                // local aqui, so para este texto de apoio. Nao alimenta grafico
                // nem tabela: aqueles numeros continuam vindo prontos do
                // backend (units.flowrate_to_display), essa e so uma segunda
                // exibicao do MESMO calculo, nao uma segunda fonte de verdade
                // para o valor usado em outro lugar.
                <div style={{ marginTop: '4px', fontSize: '11.5px', lineHeight: 1.5 }}>
                  <span className="text-muted">
                    {'= '}{fmtBblMin((Number(fflowrate) * 42) / payzoneThickness)}–{fmtBblMin((Number(iflowrate) * 42) / payzoneThickness)} gal/(ft.min) on chart
                  </span>
                </div>
              )}
              {validityBlockFresh && (
                <div style={{ marginTop: '8px', fontSize: '11.5px', lineHeight: 1.5 }}>
                  <span className="text-muted">Recommended sweep window per target (±1 decade around optimum q):</span>
                  <ul style={{ margin: '3px 0 0', paddingLeft: '16px' }}>
                    {radialState.curves.map((c, i) => (
                      <li key={i}>
                        <span style={{ color: 'var(--color-accent-700)', fontWeight: 500 }}>{c.target_label}</span>
                        {c.metadata ? (
                          <>
                            {' — '}{fmtBblMin(c.metadata.validity_min_gal_ft_min)}–{fmtBblMin(c.metadata.validity_max_gal_ft_min)} gal/(ft.min){' '}
                            <span className="text-muted">(opt {fmtBblMin(c.metadata.q_opt_gal_ft_min)})</span>
                          </>
                        ) : (
                          <span className="text-muted"> — no interior optimum in the searched range</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {flowRegime === 'linear' && dataCurve.processed && dataCurve.metadata && (
                <div style={{ marginTop: '8px', fontSize: '11.5px', lineHeight: 1.5 }}>
                  <span className="text-muted">Recommended sweep window (±1 decade around optimum q): </span>
                  {fmtBblMin(dataCurve.metadata.validity_min_cm3_min)}–{fmtBblMin(dataCurve.metadata.validity_max_cm3_min)} cm³/min{' '}
                  <span className="text-muted">(opt {fmtBblMin(dataCurve.metadata.q_opt_cm3_min)})</span>
                </div>
              )}
            </div>
            <div className="field">
              <label>Number of steps <span style={{ color: 'var(--color-accent-700)', fontWeight: 500 }}>{step_numbers}</span></label>
              <input type="range" min="10" max="200" step="5" style={{ width: '100%', height: '36px' }} value={step_numbers} onChange={(e) => dispatch(setParameter({ key: 'step_numbers', value: e.target.value }))} />
            </div>
            {visibleChart === 'design' && (
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Temperatures to compare <span className="text-muted">(K)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
                  {designTemperatures.map((temp, i) => (
                    <span key={i} className="tag tag-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {temp}
                      <button type="button" onClick={() => handleRemoveDesignTemperature(i)} aria-label="Remove temperature" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                  {designTemperatures.length < 6 && (
                    <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                      <input type="number" className="input" style={{ width: '84px', minHeight: '28px', padding: '2px 6px' }} placeholder="e.g. 338.71" value={newDesignTemperature} onChange={(e) => setNewDesignTemperature(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDesignTemperature(); } }} />
                      <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }} onClick={handleAddDesignTemperature}>+ add</button>
                    </div>
                  )}
                </div>
                {designTemperatureError && <p style={{ color: '#c0392b', fontSize: '11.5px', margin: '6px 0 0' }}>{designTemperatureError}</p>}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-[14px_20px] mt-[16px] pt-[16px] border-t border-[var(--color-divider)]">
            <div className="field" style={{ gridColumn: 'span 1' }}>
              <label>Flowrates to compare <span className="text-muted">(bbl/min)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
                {skinFlowrates.map((flowrate, i) => (
                  <span key={i} className="tag tag-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {flowrate}
                    <button type="button" onClick={() => handleRemoveSkinFlowrate(i)} aria-label="Remove flowrate" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
                {skinFlowrates.length < 6 && (
                  <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                    <input type="number" className="input" style={{ width: '84px', minHeight: '28px', padding: '2px 6px' }} placeholder="e.g. 1.2" value={newSkinFlowrate} onChange={(e) => setNewSkinFlowrate(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkinFlowrate(); } }} />
                    <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }} onClick={handleAddSkinFlowrate}>+ add</button>
                  </div>
                )}
              </div>
              {skinFlowrateError && <p style={{ color: '#c0392b', fontSize: '11.5px', margin: '6px 0 0' }}>{skinFlowrateError}</p>}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button className="btn btn-green" disabled={!canCalculate || radialAlreadyCalculated} style={{ letterSpacing: '0.06em', textTransform: 'uppercase', padding: '9px 20px', borderRadius: '9px', backgroundColor: radialAlreadyCalculated ? '#7a8580' : canCalculate ? '#268045' : '#3f7d55', cursor: radialAlreadyCalculated ? 'not-allowed' : undefined }} onClick={handleCurve}>
            {radialAlreadyCalculated ? 'Calculated' : 'Calculate'}
          </button>
          <button className="btn btn-amber" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: '9px', backgroundColor: '#DF831A' }} onClick={handleReset}>Reset parameters</button>
          <span style={{ flex: 1 }}></span>
          <span className="tag tag-accent" style={{ alignSelf: 'center' }}>{(flowRegime === 'radial' ? radialState.processed : dataCurve.processed) ? "Solved · " + step_numbers + " steps" : "Not calculated"}</span>
        </div>
      </section>
    </>
  )
}

export { default as AdjustedParametersCard } from "./AdjustedParameters";