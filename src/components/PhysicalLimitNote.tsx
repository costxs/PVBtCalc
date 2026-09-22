import { SEVERITY_COLORS } from "../tools/pointSeverity";
import { translate, type TKey } from "../i18n";
import type { Language } from "../redux/ui/slice";

// Nota de limite fisico (1000 gal/ft), compartilhada pelo Design Plot e pelo Optimum
// Analysis radial. `swept` diz O QUE foi varrido -- "length" (Design Plot) ou a chave do
// parametro do Optimum Analysis -- para o texto nomear a grandeza certa.
const SWEPT_NOUN: Record<string, TKey> = {
  length: 'limit.noun_length',
  temperature: 'limit.noun_temperature',
  porosity: 'limit.noun_porosity',
  acid_concentration: 'limit.noun_acid_concentration',
  wellbore_diameter: 'limit.noun_wellbore_diameter',
  payzone_thickness: 'limit.noun_payzone_thickness',
};

export default function PhysicalLimitNote({ lang, swept }: { lang: Language; swept: string }) {
  const noun = translate(lang, SWEPT_NOUN[swept] ?? 'limit.noun_default');
  return (
    <div role="alert" style={{
      margin: '0 2px 10px', padding: '9px 12px', fontSize: '12px', lineHeight: 1.5,
      border: `1px solid ${SEVERITY_COLORS.warn}`, borderLeft: `4px solid ${SEVERITY_COLORS.warn}`,
      borderRadius: '6px', background: '#fdf5ea', color: '#7a4a12',
    }}>
      <strong>{translate(lang, 'limit.title')}</strong> {translate(lang, 'limit.body_before', { noun })} <strong>{translate(lang, 'limit.clipped')}</strong>. {translate(lang, 'limit.body_after')}
    </div>
  );
}
