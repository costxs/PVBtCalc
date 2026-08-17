import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { setParameter, resetParameter, setGeometry } from "../redux/setup/slice";
import { fetchCurve, setId, setSystem, setOthers } from "../redux/results/slice";
import { addCurve } from "../redux/storageresults/slice";
import { fetchParam } from "../redux/parameters/slice";
import { useEffect, useState } from "react";
import InletSection from "./InletPressure";

export default function SimuSetupCard() {
  const getLegen = (key: string) => {
    switch (key) {
      case ('ro'): return 'Acid Density';
      case ('X'): return 'Acid Volumetric Dissolving Power, 100% HCl';
      case ('x'): return 'Acid Volumetric Dissolving Power, fraction HCl';
      case ('n'): return 'Enhanced Permeability Area Factor';
      case ('a'): return 'Enhanced Permeability Zone Flow Coefficient, m²⁻²ⁿ';
      case ('b'): return 'Wormhole Flow Coefficient, s/m';
      case ('k0'): return 'Mass Transfer Coefficient Static Constant, 1/m²';
      default: return ''
    }
  }
  
  const setup = useSelector((state: RootState) => state.setup)
  const { flowrate: iflowrate, minimum_flowrate: fflowrate, acid_concentration: aConcentration, temperature, acid_type: acidType, step_numbers, id, rock_type, core_porosity, core_length, core_diameter } = setup;
  const dataCurve = useSelector((state: RootState) => state.results)
  const dispatch = useDispatch()
  const [subTab, setSubTab] = useState('adjusted')
  const data = useSelector((state: RootState) => state.parameters)
  const { ids } = useSelector((state: RootState) => state.resultCurves)

  const handleCurve = () => {
    dispatch(setId(id));
    dispatch(setSystem({ acid: acidType, rock: rock_type }))
    dispatch(setOthers(setup));
    dispatch((fetchCurve() as any));
    dispatch((fetchParam() as any));
  };

  const handleReset = () => {
    dispatch(resetParameter());
  }

  useEffect(() => {
    if (dataCurve.processed && dataCurve.id) {
      dispatch(addCurve(dataCurve));
    }
  }, [dataCurve.processed]);

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

        <div style={{ display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr)', gap: '18px', alignItems: 'start' }}>
          <figure className="blueprint duotone" style={{ width: '96px', height: '96px', margin: 0 }}>
            <img src={rockSrc} alt="Core sample" style={{ width: '110px', height: '93px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = '/rockImages/IndianaLimestone.jpg' }} />
          </figure>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px 14px' }}>
            <div className="field" style={{ gridColumn: 'span 3' }}>
              <label>Simulation ID</label>
              <input className="input" placeholder="1" value={id} onChange={(e) => dispatch(setParameter({ key: 'id', value: e.target.value }))} />
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
            <div className="field">
              <label>Core Length <span className="text-muted">(in)</span></label>
              <input type="number" className="input" value={core_length} onChange={(e) => dispatch(setGeometry({ rock: rock_type, length: Number(e.target.value), diameter: core_diameter, porosity: core_porosity }))} />
            </div>
            <div className="field">
              <label>Core Diameter <span className="text-muted">(in)</span></label>
              <input type="number" className="input" value={core_diameter} onChange={(e) => dispatch(setGeometry({ rock: rock_type, length: core_length, diameter: Number(e.target.value), porosity: core_porosity }))} />
            </div>
            <div className="field">
              <label>System Temperature <span className="text-muted">(°C)</span></label>
              <input type="number" className="input" value={temperature} onChange={(e) => handleParam({ key: 'temperature', value: Number(e.target.value) })} />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Acid System</label>
              <select className="input" value={acidType} onChange={(e) => handleParam({ key: 'acid_type', value: e.target.value })}>
                <option value="HCl">HCl</option>
                <option value="HCl With Inibithor Corrosion">HCl With Inibithor Corrosion</option>
                <option value="HCl Emulsified">HCl Emulsified</option>
              </select>
            </div>
            <div className="field">
              <label>Acid Concentration <span className="text-muted">(w/w)</span></label>
              <input type="number" className="input" value={aConcentration} onChange={(e) => handleParam({ key: 'acid_concentration', value: Number(e.target.value) })} />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '14px 20px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-divider)' }}>
          <div className="field">
            <label>Flowrate sweep <span className="text-muted">(cm³/min)</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 14px 1fr', gap: '6px', alignItems: 'center' }}>
              <input type="number" className="input" value={fflowrate} onChange={(e) => dispatch(setParameter({ key: 'minimum_flowrate', value: e.target.value }))} />
              <span className="text-muted" style={{ textAlign: 'center', fontSize: '13px' }}>–</span>
              <input type="number" className="input" value={iflowrate} onChange={(e) => dispatch(setParameter({ key: 'flowrate', value: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label>Number of steps <span style={{ color: 'var(--color-accent-700)', fontWeight: 500 }}>{step_numbers}</span></label>
            <input type="range" min="10" max="200" step="5" style={{ width: '100%', height: '36px' }} value={step_numbers} onChange={(e) => dispatch(setParameter({ key: 'step_numbers', value: e.target.value }))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button className="btn btn-green" disabled={id ? (ids.includes(id) ? true : false) : true} style={{ letterSpacing: '0.06em', textTransform: 'uppercase', padding: '9px 20px', borderRadius: '9px', backgroundColor: id && !ids.includes(id) ? '#268045' : '#3f7d55' }} onClick={handleCurve}>
            Calculate
          </button>
          <button className="btn btn-amber" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: '9px', backgroundColor: '#DF831A' }} onClick={handleReset}>Reset parameters</button>
          <span style={{ flex: 1 }}></span>
          <span className="tag tag-accent" style={{ alignSelf: 'center' }}>{dataCurve.processed ? "Solved · " + step_numbers + " steps" : "Not calculated"}</span>
        </div>
      </section>

      <section className="blueprint" style={{ padding: '18px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <span className="secnum">02</span>
          <div className="seg">
            <label className="seg-opt"><input type="radio" name="param-tab" value="adjusted" checked={subTab === 'adjusted'} onChange={(e) => setSubTab(e.target.value)} />Adjusted Parameters</label>
            <label className="seg-opt"><input type="radio" name="param-tab" value="inlet" checked={subTab === 'inlet'} onChange={(e) => setSubTab(e.target.value)} />Inlet Pressure</label>
          </div>
          <span style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }}></span>
        </div>

        {subTab === 'adjusted' && (
          <div>
            <table className="table" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>Parameter</th>
                  <th style={{ textAlign: 'center' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data).map(([key, value], rowIndex) => (
                  <tr key={rowIndex} title={getLegen(key)} style={{ cursor: 'help' }}>
                    <td style={{ textAlign: 'center', fontWeight: 500, padding: '9px var(--space-2)' }}>{key}</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontSize: '17px', color: 'var(--color-accent-700)', padding: '9px var(--space-2)' }}>
                      {value ? (Math.abs(value as number) < 0.001 || Math.abs(value as number) > 1000 ? (value as number).toExponential(2) : (value as number).toFixed(4)) : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-muted" style={{ margin: '12px 0 0', fontSize: '11.5px', textAlign: 'center' }}>For more information on the description of a variable, position the cursor over it.</p>
          </div>
        )}

        {subTab === 'inlet' && (
          <InletSection />
        )}
      </section>
    </>
  )
}