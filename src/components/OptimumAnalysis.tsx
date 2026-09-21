import { useDispatch, useSelector } from "react-redux"
import { RootState } from "../redux/store"
import { setAnalitical, setParam, setflowrate } from "../redux/optsetup/slice"
import { fetchAnalitical, fetchRadialOptimumSweep, RadialSweepArgs } from "../redux/analysisresults/slice"
import { useState } from "react"
import { setParameter } from "../redux/setup/slice";
import { lambdaToFt, lambdaToSkin, computeBeta, L_CHAR } from "../redux/radial/targetConversion"
import { validateSweep, SweepFieldErrors, T_CALIBRATED_K } from "../tools/sweepValidation"

// Espessura entra: q_opt e V_opt (por pe) escalam como h^(n-1) -- ver services/radial_optimum_sweep.py.
const RADIAL_PARAMS: { value: RadialSweepArgs["sweepParam"]; label: string }[] = [
  { value: "temperature", label: "Temperature (K)" },
  { value: "porosity", label: "Porosity (fraction)" },
  { value: "acid_concentration", label: "Acid Concentration (w/w)" },
  { value: "wellbore_diameter", label: "Wellbore Diameter (in)" },
  { value: "payzone_thickness", label: "Payzone Thickness (ft)" },
]

const fieldError = (msg?: string) =>
  msg ? <div role="alert" style={{ color: '#c0392b', fontSize: '11.5px', marginTop: '4px' }}>{msg}</div> : null

export default function OptimalAnalysis() {
  const dispatch = useDispatch()
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

  const beta = computeBeta(radial.wellboreSizeMode === 'diameter' ? radial.wellboreSize / 2 : radial.wellboreSize)
  const targetLabels = radial.targetsLambda.map((lam) =>
    radial.targetMode === 'length' ? `${lambdaToFt(lam, L_CHAR).toFixed(2)} ft` : `skin ${lambdaToSkin(lam, beta).toFixed(2)}`
  )
  const safeTargetIndex = Math.min(targetIndex, Math.max(targetLabels.length - 1, 0))

  const handleAnalitical = () => {
    const errs = validateSweep(analitical_param, minimum_analitical, selectedParam, 'linear')
    setErrors(errs)
    if (errs.minimum || errs.maximum) return
    dispatch(setParameter({ key: dic[analitical_param], value: selectedParam }))
    dispatch(fetchAnalitical() as any)
  }

  const handleRadial = () => {
    const errs = validateSweep(radialParam, radialMin, radialMax, 'radial')
    setErrors(errs)
    if (errs.minimum || errs.maximum) return
    dispatch(fetchRadialOptimumSweep({
      sweepParam: radialParam,
      minimum: Number(radialMin),
      maximum: Number(radialMax),
      targetIndex: safeTargetIndex,
    }) as any)
  }

  const invalid = (msg?: string) => (msg ? { borderColor: '#c0392b' } : undefined)

  return (
    <section className="blueprint" style={{ padding: '18px 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '14px' }}>
        <span className="secnum">04</span>
        <h5 style={{ margin: 0, fontSize: '18px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Optimum Analysis</h5>
        <span style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }}></span>
      </div>

      {isRadial ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
          <div className="field">
            <label>Sweep parameter</label>
            <select className="input" value={radialParam} onChange={e => { setRadialParam(e.target.value as RadialSweepArgs["sweepParam"]); setErrors({}) }}>
              {RADIAL_PARAMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Minimum</label>
            <input type="number" className="input" placeholder="min" value={radialMin} style={invalid(errors.minimum)} onChange={e => setRadialMin(e.target.value)} />
            {fieldError(errors.minimum)}
          </div>
          <div className="field">
            <label>Maximum</label>
            <input type="number" className="input" placeholder="max" value={radialMax} style={invalid(errors.maximum)} onChange={e => setRadialMax(e.target.value)} />
            {fieldError(errors.maximum)}
            {radialParam === 'temperature' && !errors.minimum && !errors.maximum && (Number(radialMin) < T_CALIBRATED_K[0] || Number(radialMax) > T_CALIBRATED_K[1]) && radialMin !== '' && radialMax !== '' && (
              <div role="status" style={{ color: '#7a4a12', fontSize: '11.5px', marginTop: '4px' }}>Outside the calibrated range ({T_CALIBRATED_K[0]}–{T_CALIBRATED_K[1]} K).</div>
            )}
          </div>
          <div className="field">
            <label>Target wormhole length</label>
            <select className="input" value={safeTargetIndex} onChange={e => setTargetIndex(Number(e.target.value))}>
              {targetLabels.map((l, i) => <option key={i} value={i}>{l}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
          <div className="field">
            <label>Sweep parameter</label>
            <select className="input" value={analitical_param} onChange={e => { dispatch(setParam(e.target.value)); setErrors({}) }}>
              <option value="temperature">Temperature (°C)</option>
              <option value="core length">Core Length (in)</option>
              <option value="core diameter">Core Diameter (in)</option>
              <option value="core porosity">Core Porosity (fraction)</option>
              <option value="acid concentration">Acid Concentration (w/w)</option>
            </select>
          </div>
          <div className="field">
            <label>Minimum</label>
            <input type="number" className="input" placeholder="min" value={minimum_analitical as any} style={invalid(errors.minimum)} onChange={e => dispatch(setAnalitical(e.target.value))} />
            {fieldError(errors.minimum)}
          </div>
          <div className="field">
            <label>Maximum</label>
            <input type="number" className="input" placeholder="max" value={selectedParam as any} style={invalid(errors.maximum)} onChange={e => setSelectedParam(e.target.value as any)} />
            {fieldError(errors.maximum)}
          </div>
          <div className="field">
            <label>Flowrate <span className="text-muted">(cm³/min)</span></label>
            <input type="number" className="input" placeholder="q0" value={flowrate as any} onChange={e => dispatch(setflowrate(e.target.value))} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px' }}>
        <button className="btn btn-dark" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', padding: '9px 18px', position: 'static', borderRadius: '9px' }} onClick={isRadial ? handleRadial : handleAnalitical}>
          Plot analysis curve
        </button>
        <span className="text-muted" style={{ fontSize: '11.5px' }}>
          {isRadial
            ? 'Solves the optimum injection rate at the chosen target for each swept value. Every other input is taken from the run setup.'
            : 'Every other input is taken from the run setup above.'}
        </span>
      </div>
    </section>
  )
}
