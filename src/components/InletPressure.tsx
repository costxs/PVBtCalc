import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { useT } from "../i18n";
import { parseDecimal, localizeNumberText } from "../tools/parseDecimal";
import NumberInput from "./NumberInput";

export default function InletSection() {
  const { t, lang } = useT();
  const { core_diameter, core_length } = useSelector((state: RootState) => state.setup)
  const [mi, setMi] = useState<number | string>("");
  const [k, setK] = useState<number | string>("");
  const [q0max, setQ0max] = useState<number | string>("");
  const [backPressure, setBackPressure] = useState<number | string>("");
  const [inletPressure, setInletPressure] = useState<number>(0);

  const calculatePressure = () => {
    const radius = core_diameter / 2;
    const area = Math.PI * Math.pow(radius, 2);
    const q = parseDecimal(String(q0max)), visc = parseDecimal(String(mi)), perm = parseDecimal(String(k)), back = parseDecimal(String(backPressure));
    if (q === null || visc === null || perm === null || back === null) { setInletPressure(NaN); return; }
    const deltap = (q * visc * core_length) / (perm * area);
    setInletPressure(deltap + back);
  };
  
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px_14px]">
        <div className="field">
          <label>{t('inlet.flowrate')} <span className="text-muted">(cm³/min)</span></label>
          <NumberInput className="input" value={q0max} onChange={() => {}} onText={setQ0max} />
        </div>
        <div className="field">
          <label>{t('inlet.viscosity')} <span className="text-muted">(cP)</span></label>
          <NumberInput className="input" value={mi} onChange={() => {}} onText={setMi} />
        </div>
        <div className="field">
          <label>{t('inlet.permeability')} <span className="text-muted">(mD)</span></label>
          <NumberInput className="input" value={k} onChange={() => {}} onText={setK} />
        </div>
        <div className="field">
          <label>{t('inlet.backpressure')} <span className="text-muted">(psi)</span></label>
          <NumberInput className="input" value={backPressure} onChange={() => {}} onText={setBackPressure} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
        <button className="btn btn-dark" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: '9px' }} onClick={calculatePressure}>{t('inlet.estimate')}</button>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span className="text-muted" style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('inlet.inlet_pressure')}</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', color: 'var(--color-accent-700)' }}>{Number.isNaN(inletPressure) ? '—' : inletPressure ? localizeNumberText(Number(inletPressure).toFixed(3), lang) : 0}</span>
        </span>
      </div>
      <p className="text-muted" style={{ margin: '12px 0 0', fontSize: '11.5px' }}>{t('inlet.formula')}</p>
    </div>
  )
}