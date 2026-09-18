import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";

export default function InletSection() {
  const { core_diameter, core_length } = useSelector((state: RootState) => state.setup)
  const [mi, setMi] = useState<number | string>("");
  const [k, setK] = useState<number | string>("");
  const [q0max, setQ0max] = useState<number | string>("");
  const [backPressure, setBackPressure] = useState<number | string>("");
  const [inletPressure, setInletPressure] = useState<number>(0);

  const calculatePressure = () => {
    const radius = core_diameter / 2;
    const area = Math.PI * Math.pow(radius, 2);
    const deltap = (Number(q0max) * Number(mi) * core_length) / (Number(k) * area);
    const iPValue = Number(deltap) + Number(backPressure);
    setInletPressure(iPValue);
  };
  
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px_14px]">
        <div className="field">
          <label>Flowrate <span className="text-muted">(cm³/min)</span></label>
          <input className="input" value={q0max} onChange={(e) => setQ0max(e.target.value)} />
        </div>
        <div className="field">
          <label>Viscosity <span className="text-muted">(cP)</span></label>
          <input className="input" value={mi} onChange={(e) => setMi(e.target.value)} />
        </div>
        <div className="field">
          <label>Permeability <span className="text-muted">(mD)</span></label>
          <input className="input" value={k} onChange={(e) => setK(e.target.value)} />
        </div>
        <div className="field">
          <label>Backpressure <span className="text-muted">(psi)</span></label>
          <input className="input" value={backPressure} onChange={(e) => setBackPressure(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
        <button className="btn btn-dark" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: '9px' }} onClick={calculatePressure}>Estimate inlet pressure</button>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span className="text-muted" style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Inlet pressure</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', color: 'var(--color-accent-700)' }}>{inletPressure ? Number(inletPressure).toFixed(3) : 0}</span>
        </span>
      </div>
      <p className="text-muted" style={{ margin: '12px 0 0', fontSize: '11.5px' }}>Δp = q · μ · L / (k · A), with A from the core diameter of the run setup; inlet pressure adds the backpressure.</p>
    </div>
  )
}