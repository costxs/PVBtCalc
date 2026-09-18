import React from 'react';

// Estilos compartilhados pelas duas linguas -- mudar o visual de uma
// equacao/tabela/callout aqui muda para PT e EN ao mesmo tempo, que e
// exatamente a divergencia que este arquivo existe para evitar.
export const sobreOModeloStyles = `
.som-content h2 { font: 600 19px/1.3 var(--font-heading); letter-spacing: 0.03em; margin: 32px 0 14px; padding-bottom: 6px; border-bottom: 1px solid var(--color-divider); color: var(--color-accent-900); }
.som-content h2:first-of-type { margin-top: 0; }
.som-content h3 { font: 600 16px/1.3 var(--font-heading); margin: 22px 0 10px; color: var(--color-accent-800); }
.som-content h4 { font: 600 13px/1.4 var(--font-heading); margin: 18px 0 8px; color: var(--color-accent-800); }
.som-content p { margin: 10px 0; }
.som-title { font: 600 20px/1.3 var(--font-heading); color: var(--color-accent-900); margin: 0 0 4px; }
.som-subtitle { font-size: 15px; color: var(--color-neutral-700); margin: 0 0 2px; }
.som-tagline { font-size: 14px; color: var(--color-neutral-500); margin: 0 0 20px; font-style: italic; }
.som-eq { margin: 16px 0; padding: 14px 18px; background: var(--color-accent-100); border-left: 3px solid var(--color-accent); border-radius: var(--radius-sm); overflow-x: auto; }
.som-eq-body { font: 500 15px/1.5 var(--font-heading); color: var(--color-accent-900); display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.som-eq-num { color: var(--color-neutral-500); font-size: 13px; white-space: nowrap; }
.som-eq-fonte { margin-top: 8px; font-size: 12px; color: var(--color-neutral-500); font-style: italic; }
.som-ressalva { margin: 18px 0; padding: 14px 18px; background: #fdf3e4; border-left: 3px solid #b87a33; border-radius: var(--radius-sm); }
.som-ressalva-titulo { font: 600 13px/1.4 var(--font-heading); text-transform: uppercase; letter-spacing: 0.04em; color: #9c672a; margin-bottom: 6px; }
.som-ressalva p { margin: 6px 0; }
.som-frac { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; margin: 0 3px; font-size: 0.94em; line-height: 1.2; }
.som-frac-num, .som-frac-den { padding: 0 3px; }
.som-frac-num { border-bottom: 1px solid currentColor; }
.sm-nota { color: var(--color-neutral-500); font-size: 13px; font-style: italic; margin: 10px 0; }
`;

export const Eq: React.FC<{ n?: string; fonte: string; children: React.ReactNode }> = ({ n, fonte, children }) => (
  <div className="som-eq">
    <div className="som-eq-body">
      <span>{children}</span>
      {n && <span className="som-eq-num">({n})</span>}
    </div>
    <div className="som-eq-fonte">{fonte}</div>
  </div>
);

export const Frac: React.FC<{ num: React.ReactNode; den: React.ReactNode }> = ({ num, den }) => (
  <span className="som-frac">
    <span className="som-frac-num">{num}</span>
    <span className="som-frac-den">{den}</span>
  </span>
);

export const Ressalva: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <div className="som-ressalva">
    <div className="som-ressalva-titulo">{titulo}</div>
    <div>{children}</div>
  </div>
);

export const DocTable: React.FC<{ headers: React.ReactNode[]; rows: React.ReactNode[][]; caption?: React.ReactNode }> = ({ headers, rows, caption }) => (
  <div style={{ overflowX: 'auto', margin: '16px 0' }}>
    <table className="table">
      <thead>
        <tr>
          {headers.map((h, i) => <th key={i}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
    {caption && <div className="sm-nota" style={{ marginTop: '6px' }}>{caption}</div>}
  </div>
);

export interface SomSection {
  id: string;
  heading: string;
}
