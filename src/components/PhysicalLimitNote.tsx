import { SEVERITY_COLORS } from "../tools/pointSeverity";

// Nota de limite fisico (1000 gal/ft), compartilhada pelo Design Plot e pelo Optimum
// Analysis radial. `swept` diz O QUE foi varrido -- "length" (Design Plot) ou a chave do
// parametro do Optimum Analysis -- para o texto nomear a grandeza certa.
const SWEPT_NOUN: Record<string, { pt: string; en: string }> = {
  length: { pt: 'comprimentos alvo', en: 'target lengths' },
  temperature: { pt: 'valores de temperatura', en: 'temperature values' },
  porosity: { pt: 'valores de porosidade', en: 'porosity values' },
  acid_concentration: { pt: 'valores de concentração de ácido', en: 'acid concentration values' },
  wellbore_diameter: { pt: 'valores de diâmetro do poço', en: 'wellbore diameter values' },
  payzone_thickness: { pt: 'valores de espessura', en: 'payzone thickness values' },
};

export default function PhysicalLimitNote({ isPt, swept }: { isPt: boolean; swept: string }) {
  const noun = SWEPT_NOUN[swept] ?? { pt: 'valores varridos', en: 'swept values' };
  return (
    <div role="alert" style={{
      margin: '0 2px 10px', padding: '9px 12px', fontSize: '12px', lineHeight: 1.5,
      border: `1px solid ${SEVERITY_COLORS.warn}`, borderLeft: `4px solid ${SEVERITY_COLORS.warn}`,
      borderRadius: '6px', background: '#fdf5ea', color: '#7a4a12',
    }}>
      {isPt ? (
        <>
          <strong>Aviso de Limite Físico:</strong> Alguns {noun.pt} exigiram volumes otimizados &gt; 1000 gal/ft e foram <strong>truncados</strong>.
          A mediana de tratamentos reais em campo é ~75 gal/ft, com teto raramente superior a 700 gal/ft (Burton et al.). Valores acima de 1000 gal/ft distorcem a escala e indicam regimes inviáveis.
        </>
      ) : (
        <>
          <strong>Physical Limit Warning:</strong> Some {noun.en} required optimized volumes &gt; 1000 gal/ft and were <strong>clipped</strong>.
          The median of real field treatments is ~75 gal/ft, with a ceiling rarely above 700 gal/ft (Burton et al.). Values above 1000 gal/ft distort the scale and indicate infeasible regimes.
        </>
      )}
    </div>
  );
}
