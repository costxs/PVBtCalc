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
import { fmtBblMin } from "../tools/validityWindow";
import { parseDecimal } from "../tools/parseDecimal";
import { celsiusToKelvin, roundCelsius, T_CALIBRATED_C } from "../tools/temperature";
import { T_CALIBRATED_K } from "../tools/sweepValidation";
import { useT, type TKey, type TParams } from "../i18n";
import NumberInput from "./NumberInput";

type FieldError = { key: TKey; params?: TParams } | null;

const LINEAR_FLOWRATE_DEFAULTS = { min: 0.5, max: 10 };
const RADIAL_FLOWRATE_DEFAULTS = { min: 0.1, max: 5 };

export default function SimuSetupCard() {
  const { t } = useT();
  const setup = useSelector((state: RootState) => state.setup)
  const { flowrate: iflowrate, minimum_flowrate: fflowrate, acid_concentration: aConcentration, temperature, acid_type: acidType, step_numbers, id, rock_type, core_porosity, core_length, core_diameter } = setup;
  const dataCurve = useSelector((state: RootState) => state.results)
  const radialState = useSelector((state: RootState) => state.radial)
  const radialParameters = useSelector((state: RootState) => state.parameters)
  const visibleChart = useSelector((state: RootState) => state.ui.visibleChart);
  const { flowRegime, wellboreSize, wellboreSizeMode, payzoneThickness, drainageRadius, targetMode, targetsLambda, skinFlowrates, radialTemperatureK, designTemperatures } = radialState;
  const wellboreRadiusIn = wellboreSizeMode === 'diameter' ? wellboreSize / 2 : wellboreSize;
  const beta = computeBeta(wellboreRadiusIn);
  const targetChips = formatTargets(targetsLambda, targetMode, { beta });

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
  const [targetError, setTargetError] = useState<FieldError>(null);
  const [newSkinFlowrate, setNewSkinFlowrate] = useState('');
  const [skinFlowrateError, setSkinFlowrateError] = useState<FieldError>(null);
  const [newDesignTemperature, setNewDesignTemperature] = useState('');
  const [designTemperatureError, setDesignTemperatureError] = useState<FieldError>(null);

  const handleAddSkinFlowrate = () => {
    const flowrate = parseDecimal(newSkinFlowrate);
    if (flowrate === null) { setSkinFlowrateError({ key: 'validation.enter_numeric' }); return; }
    if (skinFlowrates.length >= 6) { setSkinFlowrateError({ key: 'run.err_max_flowrates' }); return; }
    if (flowrate <= 0) { setSkinFlowrateError({ key: 'run.err_flowrate_positive' }); return; }
    if (skinFlowrates.includes(flowrate)) { setSkinFlowrateError({ key: 'run.err_flowrate_dup' }); return; }
    dispatch(addSkinFlowrate(flowrate));
    setNewSkinFlowrate('');
    setSkinFlowrateError(null);
  };

  const handleRemoveSkinFlowrate = (i: number) => {
    dispatch(removeSkinFlowrate(i));
  };

  const handleAddDesignTemperature = () => {
    // Typed in Celsius; designTemperatures (redux) stores Kelvin -- celsiusToKelvin converts
    // exactly once, right here, before the value touches state. Everything after that,
    // including the calibrated-range check, works on the Kelvin value: compare against
    // T_CALIBRATED_K directly, never by converting the bound to °C (283/478 K do not land on
    // an exact float after +/-273.15, so comparing in the converted unit could reject a value
    // that types exactly to the limit). T_CALIBRATED_C only formats the message.
    const tempC = parseDecimal(newDesignTemperature);
    if (tempC === null) { setDesignTemperatureError({ key: 'validation.enter_numeric' }); return; }
    if (designTemperatures.length >= 6) { setDesignTemperatureError({ key: 'run.err_max_temps' }); return; }
    const tempK = celsiusToKelvin(tempC);
    if (tempK < T_CALIBRATED_K[0] || tempK > T_CALIBRATED_K[1]) { setDesignTemperatureError({ key: 'run.err_temp_range', params: { lo: T_CALIBRATED_C[0], hi: T_CALIBRATED_C[1] } }); return; }
    if (designTemperatures.includes(tempK)) { setDesignTemperatureError({ key: 'run.err_temp_dup' }); return; }
    dispatch(addDesignTemperature(tempK));
    setNewDesignTemperature('');
    setDesignTemperatureError(null);
  };

  const handleRemoveDesignTemperature = (i: number) => {
    dispatch(removeDesignTemperature(i));
  };

  const handleFlowRegimeChange = (regime: 'linear' | 'radial') => {
    dispatch(setFlowRegime(regime));
    if (regime === 'radial') {
      dispatch(setVisibleChart('A'));
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
    setTargetError(null);
  };

  const handleAddTarget = () => {
    const typed = parseDecimal(newTarget);
    if (typed === null) { setTargetError({ key: 'validation.enter_numeric' }); return; }
    if (targetMode === 'skin' && typed >= 0) { setTargetError({ key: 'run.err_skin_negative' }); return; }
    if (targetsLambda.length >= 6) { setTargetError({ key: 'run.err_max_targets' }); return; }
    const lambda = parseTargetInput(newTarget, targetMode, { beta });
    if (lambda === null) { setTargetError({ key: targetMode === 'length' ? 'run.err_length_positive' : 'validation.enter_numeric' }); return; }
    dispatch(addTarget(lambda));
    setNewTarget('');
    setTargetError(null);
  };

  const isIdUsed = Boolean(id) && ids.some(existingId => existingId === id || existingId.startsWith(`${id} · `));

  const canCalculate = flowRegime === 'radial'
    ? Boolean(id) && targetsLambda.length > 0 && radialTemperatureK >= T_CALIBRATED_K[0] && radialTemperatureK <= T_CALIBRATED_K[1]
    : Boolean(id);

  const [radialCalculatedId, setRadialCalculatedId] = useState<string | null>(null);
  const radialAlreadyCalculated =
    flowRegime === 'radial' && radialState.processed && radialCalculatedId === id;

  const handleCurve = () => {
    if (radialAlreadyCalculated) return;
    if (isIdUsed && !window.confirm(t('run.confirm_overwrite', { id }))) {
      return;
    }
    if (flowRegime === 'radial') {
      if (!targetsLambda.length) { setTargetError({ key: 'run.err_need_target' }); return; }
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
      dispatch(setVisibleChart('A'));
    }
  }

  useEffect(() => {
    if (dataCurve.processed && dataCurve.id) {
      dispatch(addCurve(dataCurve));
    }
  }, [dataCurve.processed]);

  useEffect(() => {
    if (radialState.processed && id) {
      dispatch(setVisibleChart('A'));
      radialState.curves.forEach((c) => {
        dispatch(addCurve({
          id: `${id} · ${c.target_label}`,
          acid: acidType,
          rock: rock_type,
          porosity: core_porosity,
          concentration: aConcentration,
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
          metadata: c.metadata,
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

  // Displayed value: convert once, round for the field. The out-of-range check compares the
  // Kelvin value directly against T_CALIBRATED_K (same expression canCalculate already uses
  // above) -- never the rounded, converted display value against a converted bound.
  const radialTemperatureC = roundCelsius(radialTemperatureK, 2);
  const radialTempOutOfRange = radialTemperatureK < T_CALIBRATED_K[0] || radialTemperatureK > T_CALIBRATED_K[1];

  return (
    <>
      <section className="blueprint" id="runner" style={{ padding: '18px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
          <span className="secnum">01</span>
          <h5 style={{ margin: 0, fontSize: '18px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{t('run.title')}</h5>
          <span style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }}></span>
        </div>

        <div className="seg" style={{ marginBottom: '16px' }}>
          <label className="seg-opt"><input type="radio" name="flow-regime" value="linear" checked={flowRegime === 'linear'} onChange={() => handleFlowRegimeChange('linear')} />{t('run.regime_linear')}</label>
          <label className="seg-opt"><input type="radio" name="flow-regime" value="radial" checked={flowRegime === 'radial'} onChange={() => handleFlowRegimeChange('radial')} />{t('run.regime_radial')}</label>
        </div>

        <div className="flex flex-col md:grid md:grid-cols-[96px_minmax(0,1fr)] gap-[18px] items-start">
          <figure className="blueprint duotone" style={{ width: '96px', height: '96px', margin: 0 }}>
            <img src={rockSrc} alt={t('run.alt_core_sample')} style={{ width: '110px', height: '93px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = '/rockImages/IndianaLimestone.jpg' }} />
          </figure>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[12px_14px]">
            <div className="field" style={{ gridColumn: 'span 3' }}>
              <label>{t('run.simulation_id')}</label>
              <input className="input" placeholder="1" value={id} onChange={(e) => dispatch(setParameter({ key: 'id', value: e.target.value }))} style={{ borderColor: isIdUsed ? '#c0392b' : undefined }} />
              {isIdUsed && <div style={{ color: '#c0392b', fontSize: '11.5px', marginTop: '4px' }}>{t('run.id_exists', { id })}</div>}
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>{t('run.rock_type')}</label>
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
              <label>{t('run.core_porosity')} <span className="text-muted">{t('run.unit_fraction')}</span></label>
              <NumberInput className="input" value={core_porosity} onChange={(v) => dispatch(setGeometry({ rock: rock_type, length: core_length, diameter: core_diameter, porosity: v ?? 0 }))} />
            </div>
            {flowRegime === 'linear' ? (
              <>
                <div className="field">
                  <label>{t('run.core_length')} <span className="text-muted">(in)</span></label>
                  <NumberInput className="input" value={core_length} onChange={(v) => dispatch(setGeometry({ rock: rock_type, length: v ?? 0, diameter: core_diameter, porosity: core_porosity }))} />
                </div>
                <div className="field">
                  <label>{t('run.core_diameter')} <span className="text-muted">(in)</span></label>
                  <NumberInput className="input" value={core_diameter} onChange={(v) => dispatch(setGeometry({ rock: rock_type, length: core_length, diameter: v ?? 0, porosity: core_porosity }))} />
                </div>
              </>
            ) : (
              <>
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label>{t('run.wellbore_size')} <span className="text-muted">(in)</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 96px', gap: '6px' }}>
                    <NumberInput className="input" style={{ minWidth: 0 }} value={wellboreSize} onChange={(v) => handleRadialGeometry({ wellboreSize: v ?? 0 })} />
                    <select className="input" value={wellboreSizeMode} onChange={(e) => handleRadialGeometry({ wellboreSizeMode: e.target.value as WellboreSizeMode })}>
                      <option value="diameter">{t('run.diameter')}</option>
                      <option value="radius">{t('run.radius')}</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>{t('run.payzone_thickness')} <span className="text-muted">(ft)</span></label>
                  <NumberInput className="input" value={payzoneThickness} onChange={(v) => handleRadialGeometry({ payzoneThickness: v ?? 0 })} />
                </div>
              </>
            )}
            <div className="field">
              <label>{t('run.system_temperature')} <span className="text-muted">(°C)</span></label>
              {flowRegime === 'radial' ? (
                <>
                  <NumberInput
                    className="input"
                    value={radialTemperatureC}
                    onChange={(v) => dispatch(setRadialTemperatureK(v === null ? 0 : celsiusToKelvin(v)))}
                    style={{ borderColor: radialTempOutOfRange ? '#c0392b' : undefined }}
                  />
                  {radialTempOutOfRange && <div style={{ color: '#c0392b', fontSize: '11.5px', marginTop: '4px' }}>{t('run.err_temp_range', { lo: T_CALIBRATED_C[0], hi: T_CALIBRATED_C[1] })}</div>}
                </>
              ) : (
                <NumberInput className="input" value={temperature} onChange={(v) => handleParam({ key: 'temperature', value: v ?? 0 })} />
              )}
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>{t('run.acid_system')}</label>
              <select className="input" value={acidType} onChange={(e) => handleParam({ key: 'acid_type', value: e.target.value })}>
                <option value="HCl">{t('run.acid_hcl')}</option>
                <option value="HCl With Inhibitor Corrosion">{t('run.acid_hcl_inhibitor')}</option>
                <option value="HCl Emulsified">{t('run.acid_hcl_emulsified')}</option>
              </select>
            </div>
            <div className="field">
              <label>{t('run.acid_concentration')} <span className="text-muted">(w/w)</span></label>
              <NumberInput className="input" value={aConcentration} onChange={(v) => handleParam({ key: 'acid_concentration', value: v ?? 0 })} />
            </div>

            {flowRegime === 'radial' && (
              <div style={{ gridColumn: 'span 3' }}>
                <details>
                  <summary className="text-muted" style={{ cursor: 'pointer', fontSize: '12.5px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{t('run.advanced')}</summary>
                  <div className="field" style={{ marginTop: '10px', maxWidth: '260px' }}>
                    <label>{t('run.drainage_radius')} <span className="text-muted">{t('run.unit_ft_optional')}</span></label>
                    <NumberInput className="input" value={drainageRadius} placeholder={t('run.drainage_placeholder')} onChange={(v) => handleRadialGeometry({ drainageRadius: v })} />
                  </div>
                  {(drainageRadius == null || drainageRadius <= 0) && (
                    <p className="text-muted" style={{ fontSize: '11.5px', margin: '6px 0 0' }}>{t('run.no_drainage_note')}</p>
                  )}
                </details>
              </div>
            )}

            {flowRegime === 'radial' && (
              <div className="field" style={{ gridColumn: 'span 3' }}>
                <div className="seg" style={{ marginBottom: '10px' }}>
                  <label className="seg-opt"><input type="radio" name="target-mode" value="length" checked={targetMode === 'length'} onChange={() => handleTargetMode('length')} />{t('run.target_length')}</label>
                  <label className="seg-opt"><input type="radio" name="target-mode" value="skin" checked={targetMode === 'skin'} onChange={() => handleTargetMode('skin')} />{t('run.target_skin')}</label>
                </div>
                <label>{t('run.targets')} <span className="text-muted">{targetMode === 'length' ? '(ft)' : t('run.unit_dimensionless')}</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
                  {targetChips.map((chip, i) => (
                    <span key={i} className="tag tag-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {t(targetMode === 'length' ? 'run.chip_length' : 'run.chip_skin', { value: chip.label })}
                      <button type="button" onClick={() => dispatch(removeTarget(i))} aria-label={t('run.aria_remove_target')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                  {targetsLambda.length < 6 && (
                    <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                      <NumberInput className="input" style={{ width: '84px', minHeight: '28px', padding: '2px 6px' }} placeholder={t(targetMode === 'length' ? 'run.placeholder_target_length' : 'run.placeholder_target_skin')} value={newTarget} onChange={() => {}} onText={setNewTarget} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTarget(); } }} />
                      <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }} onClick={handleAddTarget}>{t('run.add')}</button>
                    </div>
                  )}
                </div>
                {targetError && <p style={{ color: '#c0392b', fontSize: '11.5px', margin: '6px 0 0' }}>{t(targetError.key, targetError.params)}</p>}
              </div>
            )}
          </div>
        </div>

        {visibleChart !== 'skin' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px_20px] mt-[16px] pt-[16px] border-t border-[var(--color-divider)]">
            <div className="field">
              <label>{t('run.flowrate_sweep')} <span className="text-muted">({flowRegime === 'radial' ? 'bbl/min' : 'cm³/min'})</span></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 14px 1fr', gap: '6px', alignItems: 'center' }}>
                <NumberInput className="input" value={fflowrate} onChange={(v) => dispatch(setParameter({ key: 'minimum_flowrate', value: v === null ? '' : String(v) }))} />
                <span className="text-muted" style={{ textAlign: 'center', fontSize: '13px' }}>–</span>
                <NumberInput className="input" value={iflowrate} onChange={(v) => dispatch(setParameter({ key: 'flowrate', value: v === null ? '' : String(v) }))} />
              </div>
              {flowRegime === 'radial' && payzoneThickness > 0 && Number.isFinite(Number(fflowrate)) && Number.isFinite(Number(iflowrate)) && (
                <div style={{ marginTop: '4px', fontSize: '11.5px', lineHeight: 1.5 }}>
                  <span className="text-muted">
                    {'= '}{t('run.on_chart', { min: fmtBblMin((Number(fflowrate) * 42) / payzoneThickness), max: fmtBblMin((Number(iflowrate) * 42) / payzoneThickness) })}
                  </span>
                </div>
              )}
              {validityBlockFresh && (
                <div style={{ marginTop: '8px', fontSize: '11.5px', lineHeight: 1.5 }}>
                  <span className="text-muted">{t('run.window_per_target')}</span>
                  <ul style={{ margin: '3px 0 0', paddingLeft: '16px' }}>
                    {radialState.curves.map((c, i) => (
                      <li key={i}>
                        <span style={{ color: 'var(--color-accent-700)', fontWeight: 500 }}>{c.target_label}</span>
                        {c.metadata ? (
                          <>
                            {' — '}{fmtBblMin(c.metadata.validity_min_gal_ft_min)}–{fmtBblMin(c.metadata.validity_max_gal_ft_min)} gal/(ft.min){' '}
                            <span className="text-muted">{t('run.opt', { value: fmtBblMin(c.metadata.q_opt_gal_ft_min) })}</span>
                          </>
                        ) : (
                          <span className="text-muted">{t('run.no_interior_optimum')}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {flowRegime === 'linear' && dataCurve.processed && dataCurve.metadata && (
                <div style={{ marginTop: '8px', fontSize: '11.5px', lineHeight: 1.5 }}>
                  <span className="text-muted">{t('run.window_linear')}</span>
                  {fmtBblMin(dataCurve.metadata.validity_min_cm3_min)}–{fmtBblMin(dataCurve.metadata.validity_max_cm3_min)} cm³/min{' '}
                  <span className="text-muted">{t('run.opt', { value: fmtBblMin(dataCurve.metadata.q_opt_cm3_min) })}</span>
                </div>
              )}
            </div>
            <div className="field">
              <label>{t('run.number_of_steps')} <span style={{ color: 'var(--color-accent-700)', fontWeight: 500 }}>{step_numbers}</span></label>
              <input type="range" min="10" max="200" step="5" style={{ width: '100%', height: '36px' }} value={step_numbers} onChange={(e) => dispatch(setParameter({ key: 'step_numbers', value: e.target.value }))} />
            </div>
            {visibleChart === 'design' && (
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>{t('run.temperatures_to_compare')} <span className="text-muted">(°C)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
                  {designTemperatures.map((temp, i) => (
                    <span key={i} className="tag tag-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {roundCelsius(temp, 2)}
                      <button type="button" onClick={() => handleRemoveDesignTemperature(i)} aria-label={t('run.aria_remove_temperature')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                  {designTemperatures.length < 6 && (
                    <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                      <NumberInput className="input" style={{ width: '84px', minHeight: '28px', padding: '2px 6px' }} placeholder={t('run.placeholder_temperature')} value={newDesignTemperature} onChange={() => {}} onText={setNewDesignTemperature} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDesignTemperature(); } }} />
                      <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }} onClick={handleAddDesignTemperature}>{t('run.add')}</button>
                    </div>
                  )}
                </div>
                {designTemperatureError && <p style={{ color: '#c0392b', fontSize: '11.5px', margin: '6px 0 0' }}>{t(designTemperatureError.key, designTemperatureError.params)}</p>}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-[14px_20px] mt-[16px] pt-[16px] border-t border-[var(--color-divider)]">
            <div className="field" style={{ gridColumn: 'span 1' }}>
              <label>{t('run.flowrates_to_compare')} <span className="text-muted">(bbl/min)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
                {skinFlowrates.map((flowrate, i) => (
                  <span key={i} className="tag tag-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {flowrate}
                    <button type="button" onClick={() => handleRemoveSkinFlowrate(i)} aria-label={t('run.aria_remove_flowrate')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
                {skinFlowrates.length < 6 && (
                  <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                    <NumberInput className="input" style={{ width: '84px', minHeight: '28px', padding: '2px 6px' }} placeholder={t('run.placeholder_flowrate')} value={newSkinFlowrate} onChange={() => {}} onText={setNewSkinFlowrate} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkinFlowrate(); } }} />
                    <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }} onClick={handleAddSkinFlowrate}>{t('run.add')}</button>
                  </div>
                )}
              </div>
              {skinFlowrateError && <p style={{ color: '#c0392b', fontSize: '11.5px', margin: '6px 0 0' }}>{t(skinFlowrateError.key, skinFlowrateError.params)}</p>}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button className="btn btn-green" disabled={!canCalculate || radialAlreadyCalculated} style={{ letterSpacing: '0.06em', textTransform: 'uppercase', padding: '9px 20px', borderRadius: '9px', backgroundColor: radialAlreadyCalculated ? '#7a8580' : canCalculate ? '#268045' : '#3f7d55', cursor: radialAlreadyCalculated ? 'not-allowed' : undefined }} onClick={handleCurve}>
            {radialAlreadyCalculated ? t('run.calculated') : t('run.calculate')}
          </button>
          <button className="btn btn-amber" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: '9px', backgroundColor: '#DF831A' }} onClick={handleReset}>{t('run.reset')}</button>
          <span style={{ flex: 1 }}></span>
          <span className="tag tag-accent" style={{ alignSelf: 'center' }}>{(flowRegime === 'radial' ? radialState.processed : dataCurve.processed) ? t('run.solved', { steps: step_numbers }) : t('run.not_calculated')}</span>
        </div>
      </section>
    </>
  )
}

export { default as AdjustedParametersCard } from "./AdjustedParameters";