import { useDispatch, useSelector } from "react-redux"
import { RootState } from "../redux/store"
import { setAnalitical, setParam, setflowrate } from "../redux/optsetup/slice"
import { fetchAnalitical } from "../redux/analysisresults/slice"
import { useState } from "react"
import { setParameter } from "../redux/setup/slice";

export default function OptimalAnalysis() {
  const dispatch = useDispatch()
  const [selectedParam, setSelectedParam] = useState('')

  const handleAnalitical = () => {
    dispatch(setParameter({ key: dic[analitical_param], value: selectedParam }))
    dispatch(fetchAnalitical() as any)
  }

  const dic: { [key: string]: string } = {
    'temperature': 'temperature',
    'core length': 'core_length',
    'core diameter': 'core_diameter',
    'core porosity': 'core_porosity',
    'acid concentration': 'acid_concentration'
  }

  const { analitical_param, minimum_analitical, flowrate } = useSelector((state: RootState) => state.optSetup)
  
  return (
    <section className="blueprint" style={{ padding: '18px 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '14px' }}>
        <span className="secnum">04</span>
        <h5 style={{ margin: 0, fontSize: '18px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Optimum Analysis</h5>
        <span style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }}></span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: '10px', alignItems: 'end' }}>
        <div className="field">
          <label>Sweep parameter</label>
          <select className="input" value={analitical_param} onChange={e => dispatch(setParam(e.target.value))}>
            <option value="temperature">Temperature (°C)</option>
            <option value="core length">Core Length (in)</option>
            <option value="core diameter">Core Diameter (in)</option>
            <option value="core porosity">Core Porosity (fraction)</option>
            <option value="acid concentration">Acid Concentration (w/w)</option>
          </select>
        </div>
        <div className="field">
          <label>Minimum</label>
          <input type="number" className="input" placeholder="min" value={minimum_analitical as any} onChange={e => dispatch(setAnalitical(e.target.value))} />
        </div>
        <div className="field">
          <label>Maximum</label>
          <input type="number" className="input" placeholder="max" value={selectedParam as any} onChange={e => setSelectedParam(e.target.value as any)} />
        </div>
        <div className="field">
          <label>Flowrate <span className="text-muted">(cm³/min)</span></label>
          <input type="number" className="input" placeholder="q0" value={flowrate as any} onChange={e => dispatch(setflowrate(e.target.value))} />
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px' }}>
        <button className="btn btn-dark" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', padding: '9px 18px', position: 'static', borderRadius: '9px' }} disabled={(minimum_analitical as any === '0' || minimum_analitical === null)} onClick={handleAnalitical}>
          Plot analysis curve
        </button>
        <span className="text-muted" style={{ fontSize: '11.5px' }}>Every other input is taken from the run setup above.</span>
      </div>
    </section>
  )
}