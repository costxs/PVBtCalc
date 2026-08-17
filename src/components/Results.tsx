import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../redux/store";
import { useEffect, useState } from "react";
import { removeCurve } from "../redux/storageresults/slice";
import exportCurveAsVerticalTable from "../tools/export";
import type { Curve } from '../redux/storageresults/slice'

export default function ResultTab() {
  const dispatch = useDispatch();
  const { ids, curves } = useSelector((state: RootState) => state.resultCurves)
  const [selectedId, setSelectedId] = useState(ids.length > 0 ? ids[0] : "");
  const [curve, setCurve] = useState(null)
  const [acid, setAcid] = useState('');
  const [rock, setRock] = useState('');
  const [data, setData] = useState({
    'q0 (cm³/min)': [0],
    'PVBt': [0],
    'iv (m/s)': [0],
    '1/Da': [0],
    'wv (m/s)': [0],
    'vbt (cm³)': [0],
    'tbt (s)': [0],
    'dv (m/s)': [0]
  })

  const handleDelete = () => {
    dispatch(removeCurve(selectedId));
    setSelectedId(ids[0] || "");
  }

  const handleCurve = (id: any) => {
    setCurve((curves as any).find((c: Curve) => c.id === id));
    if (!curve) return;
  }

  useEffect(() => {
    const lastId = ids[ids.length - 1];
    setSelectedId(lastId)
    handleCurve(lastId);
  }, [ids]);

  useEffect(() => {
    if (!curves.length) {
      setData({
        'q0 (cm³/min)': [0],
        'PVBt': [0],
        'iv (m/s)': [0],
        '1/Da': [0],
        'wv (m/s)': [0],
        'vbt (cm³)': [0],
        'tbt (s)': [0],
        'dv (m/s)': [0]
      });
      setAcid('');
      setRock('');
    }
  }, [curves]);

  const getLegen = (key: string) => {
    switch (key) {
      case ('q0 (cm³/min)'): return 'flowrate (cm³/min)';
      case ('PVBt'): return 'Pore Volume to Breakthrough (dimensionless)';
      case ('iv (m/s)'): return 'Intersticial Velocity (m/s)';
      case ('1/Da'): return 'Damkholer Number Inverse (dimensionless)';
      case ('wv (m/s)'): return 'Fluid Velocity in the Wormhole (m/s)';
      case ('vbt (cm³)'): return 'Acid Volume to Breakthrough (cm³)';
      case ('tbt (s)'): return 'Time to Breakthrough (s)';
      case ('dv (m/s)'): return 'Darcy Velocity (m/s)';
      default: return ''
    }
  }

  useEffect(() => {
    if (curve) {
      setData({
        'q0 (cm³/min)': (curve as any).flowratePoints || [],
        'PVBt': (curve as any).pvbtPoints || [],
        'iv (m/s)': (curve as any).intersticialVelocity || [],
        '1/Da': (curve as any).iDa || [],
        'wv (m/s)': (curve as any).wormholeVelocity || [],
        'vbt (cm³)': (curve as any).volumeToBt || [],
        'tbt (s)': (curve as any).timeToBt || [],
        'dv (m/s)': (curve as any).darcyVelocity || []
      });
      const { acid, rock } = curve as any;
      setAcid(acid);
      setRock(rock);
    }
  }, [curve]);

  const headers = Object.keys(data);
  const pvbtData = data["PVBt"] || [];
  const minPVBtIndex = pvbtData.length > 0 ? pvbtData.indexOf(Math.min(...pvbtData)) : -1;
  const minPVBtRow = headers.reduce((obj, key) => {
    (obj as any)[key] = (data as any)[key][minPVBtIndex];
    return obj;
  }, {});

  const getFormattedVal = (val: any) => {
    if (val == null) return '-';
    const absVal = Math.abs(val);
    if ((absVal < 0.01 && absVal > 0) || absVal > 1000) return val.toExponential(2);
    if (val !== 0) return Number(val).toFixed(3);
    return val;
  }

  const numRows = data && (data as any)[headers[0]] ? (data as any)[headers[0]].length : 0;

  return (
    <section className="blueprint" style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
        <span className="secnum">05</span>
        <h5 style={{ margin: 0, fontSize: '18px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Optimum Parameters</h5>
        <span style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }}></span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)', gap: '22px', alignItems: 'start' }}>
        <div>
          <div className="field" style={{ marginBottom: '10px' }}>
            <label>Saved run</label>
            <select className="input" value={selectedId} onChange={(e) => { handleCurve(e.target.value); setSelectedId(e.target.value) }}>
              {ids.length === 0 && <option>No saved runs yet</option>}
              {ids.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-green" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: '9px', padding: '9px 18px' }} onClick={curve ? () => exportCurveAsVerticalTable(curve) : () => null}>Export</button>
            <button className="btn btn-red" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: '9px', padding: '9px 18px' }} onClick={handleDelete}>Delete</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px', fontSize: '13px' }}>
          <span className="text-muted" style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Acid system</span>
          <span>{acid || '...'}</span>
          <span className="text-muted" style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Rock type</span>
          <span>{rock || '...'}</span>
          <span className="text-muted" style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Pore volume to bt</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: 'var(--color-accent-700)', lineHeight: '1.1' }}>
            {(minPVBtRow as any)['PVBt'] != null ? Number((minPVBtRow as any)['PVBt']).toFixed(4) : '-'}
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto', overflowY: 'auto', marginTop: '18px', flex: 1, minHeight: 0 }}>
        <table className="table" style={{ tableLayout: 'auto', width: '100%' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
            <tr>
              {headers.map((header, i) => (
                <th key={i} title={getLegen(header)} style={{ whiteSpace: 'nowrap', cursor: 'help', paddingBottom: '8px' }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(numRows)].map((_, rowIndex) => {
              const isOptimum = rowIndex === minPVBtIndex && rowIndex !== 0;
              return (
                <tr key={rowIndex} style={isOptimum ? { backgroundColor: 'var(--color-bg)', fontWeight: 'bold' } : {}}>
                  {headers.map((header, cellIndex) => (
                    <td key={cellIndex} title={getLegen(header)} style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', color: isOptimum ? 'var(--color-accent-800)' : 'var(--color-accent-700)', whiteSpace: 'nowrap', padding: '10px 8px', textAlign: 'center' }}>
                      {getFormattedVal((data as any)[header]?.[rowIndex])}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}