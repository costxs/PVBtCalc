import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import InletSection from "./InletPressure";

export default function AdjustedParametersCard() {
  const [subTab, setSubTab] = useState('adjusted');
  const data = useSelector((state: RootState) => state.parameters);

  const getLegen = (key: string) => {
    switch (key) {
      case 'ro': return 'Acid Density';
      case 'X': return 'Acid Volumetric Dissolving Power, 100% HCl';
      case 'x': return 'Acid Volumetric Dissolving Power, fraction HCl';
      case 'n': return 'Enhanced Permeability Area Factor';
      case 'a': return 'Enhanced Permeability Zone Flow Coefficient, m²⁻²ⁿ';
      case 'b': return 'Wormhole Flow Coefficient, s/m';
      case 'k0': return 'Mass Transfer Coefficient Static Constant, 1/m²';
      case 'f': return 'Flowing Fraction (fraction of pore volume receiving flow, by rock type)';
      default: return '';
    }
  };

  return (
    <section className="blueprint" style={{ padding: '18px 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <span className="secnum">02</span>
        <div className="seg">
          <label className="seg-opt">
            <input
              type="radio"
              name="param-tab"
              value="adjusted"
              checked={subTab === 'adjusted'}
              onChange={(e) => setSubTab(e.target.value)}
            />
            Adjusted Parameters
          </label>
          <label className="seg-opt">
            <input
              type="radio"
              name="param-tab"
              value="inlet"
              checked={subTab === 'inlet'}
              onChange={(e) => setSubTab(e.target.value)}
            />
            Inlet Pressure
          </label>
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
                  <td
                    style={{
                      textAlign: 'center',
                      fontFamily: 'var(--font-heading)',
                      fontSize: '17px',
                      color: 'var(--color-accent-700)',
                      padding: '9px var(--space-2)',
                    }}
                  >
                    {value
                      ? Math.abs(value as number) < 0.001 || Math.abs(value as number) > 1000
                        ? (value as number).toExponential(2)
                        : (value as number).toFixed(4)
                      : '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-muted" style={{ margin: '12px 0 0', fontSize: '11.5px', textAlign: 'center' }}>
            For more information on the description of a variable, position the cursor over it.
          </p>
        </div>
      )}

      {subTab === 'inlet' && <InletSection />}
    </section>
  );
}
