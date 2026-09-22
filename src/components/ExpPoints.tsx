import { useState } from "react"
import { addCurve } from "../redux/storageresults/slice";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../redux/store";
import type { Curve } from '../redux/storageresults/slice'
import { useT } from "../i18n";
import { parseDecimal, localizeNumberText } from "../tools/parseDecimal";
import NumberInput from "./NumberInput";

export default function ExpSection() {
  const { t, lang } = useT();
  const { ids } = useSelector((state: RootState) => state.resultCurves)
  const dispatch = useDispatch()
  const [currentPVBt, setCurrentPVBt] = useState('');
  const [currentFlow, setCurrentFlow] = useState('');
  const [currentID, setCurrentID] = useState('');
  const [expCurve, setExpCurve] = useState<Curve>({
    id: 'Exp:',
    acid: 'Experimental',
    rock: 'Experimental',
    length: 0,
    diameter: 0,
    porosity: 0,
    concentration: 0,
    temperature: 0,
    pvbtPoints: [],
    flowratePoints: [],
    intersticialVelocity: [],
    iDa: [],
    volumeToBt: [],
    timeToBt: [],
    wormholeVelocity: [],
    darcyVelocity: [],
  });

  // comma or dot; parseFloat("0,5") would silently give 0
  const parsedPVBt = parseDecimal(currentPVBt);
  const parsedFlow = parseDecimal(currentFlow);

  const handleSetPoint = () => {
    if (parsedPVBt === null || parsedFlow === null) return;
    const updatedCurve = { ...expCurve };
    updatedCurve.pvbtPoints = [...(updatedCurve.pvbtPoints ?? []), parsedPVBt];
    updatedCurve.flowratePoints = [...updatedCurve.flowratePoints, parsedFlow];
    updatedCurve.intersticialVelocity = [...updatedCurve.intersticialVelocity, 0];
    updatedCurve.iDa = [...updatedCurve.iDa, 0];
    updatedCurve.volumeToBt = [...updatedCurve.volumeToBt, 0];
    updatedCurve.timeToBt = [...updatedCurve.timeToBt, 0];
    updatedCurve.wormholeVelocity = [...updatedCurve.wormholeVelocity, 0];
    updatedCurve.darcyVelocity = [...updatedCurve.darcyVelocity, 0];
    setExpCurve(updatedCurve);
    setCurrentFlow('');
    setCurrentPVBt('');
  };

  const handleRemovePoint = (index: number) => {
    const updatedCurve = { ...expCurve };
    updatedCurve.pvbtPoints = (updatedCurve.pvbtPoints ?? []).filter((_, i) => i !== index);
    updatedCurve.flowratePoints = updatedCurve.flowratePoints.filter((_, i) => i !== index);
    updatedCurve.intersticialVelocity = updatedCurve.intersticialVelocity.filter((_, i) => i !== index);
    updatedCurve.iDa = updatedCurve.iDa.filter((_, i) => i !== index);
    updatedCurve.volumeToBt = updatedCurve.volumeToBt.filter((_, i) => i !== index);
    updatedCurve.timeToBt = updatedCurve.timeToBt.filter((_, i) => i !== index);
    updatedCurve.wormholeVelocity = updatedCurve.wormholeVelocity.filter((_, i) => i !== index);
    updatedCurve.darcyVelocity = updatedCurve.darcyVelocity.filter((_, i) => i !== index);
    setExpCurve(updatedCurve);
  };

  const validadeExport = () => {
    if ((currentID) && (expCurve.flowratePoints.length > 0)) {
      if (ids.includes("Exp: " + currentID)) {
        return false
      }
      else {
        return true
      }
    }
    else {
      return false
    }
  }

  const handleSetCurve = () => {
    const newCurve = { ...expCurve, id: 'Exp: ' + currentID };
    dispatch(addCurve(newCurve));
    setCurrentID('');
    setExpCurve(
      {
        id: 'Exp:',
        acid: 'Experimental',
        rock: 'Experimental',
        length: 0,
        diameter: 0,
        porosity: 0,
        concentration: 0,
        temperature: 0,
        pvbtPoints: [],
        flowratePoints: [],
        intersticialVelocity: [],
        iDa: [],
        volumeToBt: [],
        timeToBt: [],
        wormholeVelocity: [],
        darcyVelocity: [],
      }
    )
  }

  const data = expCurve.flowratePoints.map((flow, index) => [
    flow,
    expCurve.pvbtPoints?.[index] ?? ''
  ]);

  return (
    <section className="blueprint" style={{ padding: '18px 20px 20px', borderRadius: '9px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '14px' }}>
        <span className="secnum">03</span>
        <h5 style={{ margin: 0, fontSize: '18px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{t('exp.title')}</h5>
        <span style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }}></span>
      </div>
      
      <div className="field" style={{ marginBottom: '12px' }}>
        <label>{t('exp.curve_id')}</label>
        <input className="input" placeholder="id" value={currentID} onChange={(e) => setCurrentID(e.target.value)} />
      </div>
      
      <div className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_auto] gap-[10px] sm:items-end">
        <div className="field">
          <label>{t('exp.flowrate')} <span className="text-muted">(cm³/min)</span></label>
          <NumberInput className="input" placeholder={t('exp.flowrate')} value={currentFlow} onChange={() => {}} onText={setCurrentFlow} />
        </div>
        <div className="field">
          <label>PVBt</label>
          <NumberInput className="input" placeholder="PVBt" value={currentPVBt} onChange={() => {}} onText={setCurrentPVBt} />
        </div>
        <button className="btn btn-dark" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: '9px', minHeight: '38px' }} disabled={parsedFlow === null || parsedPVBt === null} onClick={handleSetPoint}>{t('exp.add_to_table')}</button>
      </div>

      <table className="table" style={{ marginTop: '14px', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'center' }}>q0</th>
            <th style={{ textAlign: 'center' }}>PVBt</th>
            <th style={{ width: '84px' }}></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <td style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontSize: '17px', color: 'var(--color-accent-700)', padding: '9px var(--space-2)' }}>{localizeNumberText(String(row[0]), lang)}</td>
              <td style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontSize: '17px', color: 'var(--color-accent-700)', padding: '9px var(--space-2)' }}>{localizeNumberText(String(row[1]), lang)}</td>
              <td style={{ textAlign: 'right', padding: '9px var(--space-2)' }}><button className="btn btn-ghost" style={{ fontSize: '12px' }} onClick={() => handleRemovePoint(rowIndex)}>{t('common.remove')}</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px' }}>
        <button className="btn btn-dark" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, width: '100%', padding: '9px 18px', borderRadius: '9px' }} disabled={!validadeExport()} onClick={handleSetCurve}>{t('exp.export_to_chart')}</button>
      </div>
      <p className="text-muted" style={{ margin: '10px 0 0', fontSize: '11.5px' }}>
        {t(data.length === 1 ? 'exp.points_one' : 'exp.points_many', { count: data.length })}
      </p>
    </section>
  )
}