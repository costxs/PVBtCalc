import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import InletSection from "./InletPressure";
import { useT, type TKey } from "../i18n";
import { localizeNumberText } from "../tools/parseDecimal";

export default function AdjustedParametersCard() {
  const { t, lang } = useT();
  const [subTab, setSubTab] = useState('adjusted');
  const data = useSelector((state: RootState) => state.parameters);

  const LEGEND_KEYS: Record<string, TKey> = {
    ro: 'params.l_ro', X: 'params.l_X', x: 'params.l_x', n: 'params.l_n',
    a: 'params.l_a', b: 'params.l_b', k0: 'params.l_k0', f: 'params.l_f',
  };
  const getLegen = (key: string) => (LEGEND_KEYS[key] ? t(LEGEND_KEYS[key]) : '');

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
            {t('params.tab_adjusted')}
          </label>
          <label className="seg-opt">
            <input
              type="radio"
              name="param-tab"
              value="inlet"
              checked={subTab === 'inlet'}
              onChange={(e) => setSubTab(e.target.value)}
            />
            {t('params.tab_inlet')}
          </label>
        </div>
        <span style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }}></span>
      </div>

      {subTab === 'adjusted' && (
        <div>
          <table className="table" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>{t('params.col_parameter')}</th>
                <th style={{ textAlign: 'center' }}>{t('params.col_value')}</th>
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
                        ? localizeNumberText((value as number).toExponential(2), lang)
                        : localizeNumberText((value as number).toFixed(4), lang)
                      : '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-muted" style={{ margin: '12px 0 0', fontSize: '11.5px', textAlign: 'center' }}>
            {t('params.hint')}
          </p>
        </div>
      )}

      {subTab === 'inlet' && <InletSection />}
    </section>
  );
}
