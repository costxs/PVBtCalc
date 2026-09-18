import { useState } from "react"
import { addCurve } from "../redux/storageresults/slice";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../redux/store";
import type { Curve } from '../redux/storageresults/slice'

export default function ExpSection() {
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

  const handleSetPoint = () => {
    const updatedCurve = { ...expCurve };
    updatedCurve.pvbtPoints = [...(updatedCurve.pvbtPoints ?? []), parseFloat(currentPVBt)];
    updatedCurve.flowratePoints = [...updatedCurve.flowratePoints, parseFloat(currentFlow)];
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
        <h5 style={{ margin: 0, fontSize: '18px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Plot Experimental Curves</h5>
        <span style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }}></span>
      </div>
      
      <div className="field" style={{ marginBottom: '12px' }}>
        <label>Curve ID</label>
        <input className="input" placeholder="id" value={currentID} onChange={(e) => setCurrentID(e.target.value)} />
      </div>
      
      <div className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_auto] gap-[10px] sm:items-end">
        <div className="field">
          <label>Flowrate <span className="text-muted">(cm³/min)</span></label>
          <input type="number" className="input" placeholder="Flowrate" value={currentFlow} onChange={(e) => setCurrentFlow(e.target.value)} />
        </div>
        <div className="field">
          <label>PVBt</label>
          <input type="number" className="input" placeholder="PVBt" value={currentPVBt} onChange={(e) => setCurrentPVBt(e.target.value)} />
        </div>
        <button className="btn btn-dark" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: '9px', minHeight: '38px' }} disabled={!(currentFlow && currentPVBt)} onClick={handleSetPoint}>Add to Table</button>
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
              <td style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontSize: '17px', color: 'var(--color-accent-700)', padding: '9px var(--space-2)' }}>{row[0]}</td>
              <td style={{ textAlign: 'center', fontFamily: 'var(--font-heading)', fontSize: '17px', color: 'var(--color-accent-700)', padding: '9px var(--space-2)' }}>{row[1]}</td>
              <td style={{ textAlign: 'right', padding: '9px var(--space-2)' }}><button className="btn btn-ghost" style={{ fontSize: '12px' }} onClick={() => handleRemovePoint(rowIndex)}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px' }}>
        <button className="btn btn-dark" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, width: '100%', padding: '9px 18px', borderRadius: '9px' }} disabled={!validadeExport()} onClick={handleSetCurve}>Export points to PVBt Chart</button>
      </div>
      <p className="text-muted" style={{ margin: '10px 0 0', fontSize: '11.5px' }}>
        {data.length} {data.length === 1 ? "point" : "points"} in the table
      </p>
    </section>
  )
}