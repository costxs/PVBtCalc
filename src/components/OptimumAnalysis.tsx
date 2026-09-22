import { useDispatch, useSelector } from "react-redux"
import { RootState } from "../redux/store"
import { setAnalitical, setParam, setflowrate } from "../redux/optsetup/slice"
import { fetchAnalitical, fetchRadialOptimumSweep, RadialSweepArgs } from "../redux/analysisresults/slice"
import { useState } from "react"
import { setParameter } from "../redux/setup/slice";
import { lambdaToFt, lambdaToSkin, computeBeta, L_CHAR } from "../redux/radial/targetConversion"
import { validateSweep, SweepFieldErrors, T_CALIBRATED_K } from "../tools/sweepValidation"
import { parseDecimal } from "../tools/parseDecimal"
import { celsiusToKelvin, T_CALIBRATED_C } from "../tools/temperature"
import { useT, type TKey } from "../i18n"
import NumberInput from "./NumberInput"

// Espessura entra: q_opt e V_opt (por pe) escalam como h^(n-1) -- ver services/radial_optimum_sweep.py.
const RADIAL_PARAMS: { value: RadialSweepArgs["sweepParam"]; label: TKey }[] = [
  { value: "temperature", label: "opt.p_temperature_c" },
  { value: "porosity", label: "opt.p_porosity" },
  { value: "acid_concentration", label: "opt.p_acid_concentration" },
  { value: "wellbore_diameter", label: "opt.p_wellbore_diameter" },
  { value: "payzone_thickness", label: "opt.p_payzone_thickness" },
]

export default function OptimalAnalysis() {
  const dispatch = useDispatch()
  const { t } = useT()
  const [selectedParam, setSelectedParam] = useState('')
  const [errors, setErrors] = useState<SweepFieldErrors>({})

  const [radialParam, setRadialParam] = useState<RadialSweepArgs["sweepParam"]>('temperature')
  const [radialMin, setRadialMin] = useState('')
  const [radialMax, setRadialMax] = useState('')
  const [targetIndex, setTargetIndex] = useState(0)

  const dic: { [key: string]: string } = {
    'temperature': 'temperature',
    'core length': 'core_length',
    'core diameter': 'core_diameter',
    'core porosity': 'core_porosity',
    'acid concentration': 'acid_concentration'
  }

  const { analitical_param, minimum_analitical, flowrate } = useSelector((state: RootState) => state.optSetup)
  const radial = useSelector((state: RootState) => state.radial)
  const isRadial = radial.flowRegime === 'radial'
  // Typed text is kept as text and parsed when the button is pressed (comma or dot),
  // so an unreadable entry is reported instead of silently using an older value.
  const [linearMin, setLinearMin] = useState(String(minimum_analitical ?? ''))

  const fieldError = (key?: TKey) =>
    key ? <div role="alert" style={{ color: '#c0392b', fontSize: '11.5px', marginTop: '4px' }}>{t(key)}</div> : null

  const beta = computeBeta(radial.wellboreSizeMode === 'diameter' ? radial.wellboreSize / 2 : radial.wellboreSize)
  const targetLabels = radial.targetsLambda.map((lam) =>
    radial.targetMode === 'length' ? `${lambdaToFt(lam, L_CHAR).toFixed(2)} ft` : t('opt.target_skin', { value: lambdaToSkin(lam, beta).toFixed(2) })
  )
  const safeTargetIndex = Math.min(targetIndex, Math.max(targetLabels.length - 1, 0))

  const handleAnalitical = () => {
    const errs = validateSweep(analitical_param, linearMin, selectedParam, 'linear')
    setErrors(errs)
    if (errs.minimum || errs.maximum) return
    dispatch(setAnalitical(String(parseDecimal(linearMin))))
    dispatch(setParameter({ key: dic[analitical_param], value: String(parseDecimal(selectedParam)) }))
    dispatch(fetchAnalitical() as any)
  }

  const handleRadial = () => {
    const errs = validateSweep(radialParam, radialMin, radialMax, 'radial')
    setErrors(errs)
    if (errs.minimum || errs.maximum) return
    const isTemp = radialParam === 'temperature'
    const min = parseDecimal(radialMin) as number
    const max = parseDecimal(radialMax) as number
    dispatch(fetchRadialOptimumSweep({
      sweepParam: radialParam,
      // The one conversion boundary: the field above is Celsius, the backend takes Kelvin.
      minimum: isTemp ? celsiusToKelvin(min) : min,
      maximum: isTemp ? celsiusToKelvin(max) : max,
      targetIndex: safeTargetIndex,
    }) as any)
  }

  const invalid = (msg?: TKey) => (msg ? { borderColor: '#c0392b' } : undefined)

  const rMin = parseDecimal(radialMin)
  const rMax = parseDecimal(radialMax)

  return (
    <section className="blueprint" style={{ padding: '18px 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '14px' }}>
        <span className="secnum">04</span>
        <h5 style={{ margin: 0, fontSize: '18px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{t('opt.title')}</h5>
        <span style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }}></span>
      </div>

      {isRadial ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
          <div className="field">
            <label>{t('opt.sweep_parameter')}</label>
            <select className="input" value={radialParam} onChange={e => { setRadialParam(e.target.value as RadialSweepArgs["sweepParam"]); setErrors({}) }}>
              {RADIAL_PARAMS.map(p => <option key={p.value} value={p.value}>{t(p.label)}</option>)}
            </select>
          </div>
          <div className="field">
            <label>{t('opt.minimum')}{radialParam === 'temperature' && ' (°C)'}</label>
            <NumberInput className="input" placeholder={t('opt.placeholder_min')} value={radialMin} style={invalid(errors.minimum)} onChange={() => {}} onText={setRadialMin} />
            {fieldError(errors.minimum)}
          </div>
          <div className="field">
            <label>{t('opt.maximum')}{radialParam === 'temperature' && ' (°C)'}</label>
            <NumberInput className="input" placeholder={t('opt.placeholder_max')} value={radialMax} style={invalid(errors.maximum)} onChange={() => {}} onText={setRadialMax} />
            {fieldError(errors.maximum)}
            {radialParam === 'temperature' && !errors.minimum && !errors.maximum && rMin !== null && rMax !== null && (celsiusToKelvin(rMin) < T_CALIBRATED_K[0] || celsiusToKelvin(rMax) > T_CALIBRATED_K[1]) && (
              <div role="status" style={{ color: '#7a4a12', fontSize: '11.5px', marginTop: '4px' }}>{t('opt.outside_calibrated', { lo: T_CALIBRATED_C[0], hi: T_CALIBRATED_C[1] })}</div>
            )}
          </div>
          <div className="field">
            <label>{t('opt.target_wormhole_length')}</label>
            <select className="input" value={safeTargetIndex} onChange={e => setTargetIndex(Number(e.target.value))}>
              {targetLabels.map((l, i) => <option key={i} value={i}>{l}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
          <div className="field">
            <label>{t('opt.sweep_parameter')}</label>
            <select className="input" value={analitical_param} onChange={e => { dispatch(setParam(e.target.value)); setErrors({}) }}>
              <option value="temperature">{t('opt.p_temperature_c')}</option>
              <option value="core length">{t('opt.p_core_length')}</option>
              <option value="core diameter">{t('opt.p_core_diameter')}</option>
              <option value="core porosity">{t('opt.p_core_porosity')}</option>
              <option value="acid concentration">{t('opt.p_acid_concentration')}</option>
            </select>
          </div>
          <div className="field">
            <label>{t('opt.minimum')}</label>
            <NumberInput className="input" placeholder={t('opt.placeholder_min')} value={linearMin} style={invalid(errors.minimum)} onChange={() => {}} onText={setLinearMin} />
            {fieldError(errors.minimum)}
          </div>
          <div className="field">
            <label>{t('opt.maximum')}</label>
            <NumberInput className="input" placeholder={t('opt.placeholder_max')} value={selectedParam} style={invalid(errors.maximum)} onChange={() => {}} onText={setSelectedParam} />
            {fieldError(errors.maximum)}
          </div>
          <div className="field">
            <label>{t('opt.flowrate')} <span className="text-muted">(cm³/min)</span></label>
            <NumberInput className="input" placeholder="q0" value={flowrate as any} onChange={(v) => dispatch(setflowrate(v === null ? '' : String(v)))} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px' }}>
        <button className="btn btn-dark" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', padding: '9px 18px', position: 'static', borderRadius: '9px' }} onClick={isRadial ? handleRadial : handleAnalitical}>
          {t('opt.plot')}
        </button>
        <span className="text-muted" style={{ fontSize: '11.5px' }}>
          {isRadial ? t('opt.help_radial') : t('opt.help_linear')}
        </span>
      </div>
    </section>
  )
}
