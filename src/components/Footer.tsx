import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { getFooterContent } from './footerContent';

export default function FooterSection() {
  const language = useSelector((state: RootState) => state.ui?.language);
  const content = getFooterContent(language);

  const iconLinkStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    border: '1px solid var(--color-accent-300)',
    borderRadius: 'var(--radius-sm)',
    flexShrink: 0,
  };

  const columnTitleStyle = {
    margin: 0,
    fontSize: '14px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-accent-800)',
  };

  const subtitleStyle = {
    margin: 0,
    fontSize: '12px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-accent-700)',
    fontWeight: 600,
  };

  const bodyTextStyle = {
    margin: 0,
    fontSize: '12.5px',
    lineHeight: '1.55',
    color: 'var(--color-neutral-800)',
    textWrap: 'pretty' as const,
  };

  return (
    <footer style={{ gridColumn: '1 / -1', background: '#fff', borderTop: '1px solid var(--color-accent-300)', padding: '26px 30px 30px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '34px', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--color-divider)', paddingBottom: '22px' }}>
        <div style={{ width: '150px', height: '78px' }}><img src="/image.png" alt="UFPA" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
        <div style={{ width: '150px', height: '78px' }}><img src="/lcpetro_novo.png" alt="LCPetro" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
        <div style={{ width: '150px', height: '78px' }}><img src="/labx.png" alt="LabX" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-[30px]">
        {/* Column 1: Financial Support & Development */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h6 style={columnTitleStyle}>{content.financialSupport.title}</h6>
          <p style={bodyTextStyle}>
            {content.financialSupport.textBeforeLink}
            <a href="#petrobras">{content.financialSupport.petrobrasLinkText}</a>
            {content.financialSupport.projectText}
            <strong>{content.financialSupport.studyTitle}</strong>
          </p>

          <h6 style={{ ...columnTitleStyle, margin: '10px 0 0' }}>{content.development.title}</h6>

          {/* Phase 1: Linear Model */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={subtitleStyle}>{content.development.linearPhase.subtitle}</span>
            <p style={bodyTextStyle}>
              {content.development.linearPhase.authors},<br />
              {content.development.linearPhase.institution}
            </p>
          </div>

          {/* Phase 2: Radial Model */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <span style={subtitleStyle}>{content.development.radialPhase.subtitle}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px' }}>
              <span style={bodyTextStyle}>
                {content.development.radialPhase.authors}
              </span>
              <div style={{ display: 'inline-flex', gap: '10px', alignItems: 'center' }}>
                <a
                  href={content.development.radialPhase.links.linkedin.url}
                  aria-label={content.development.radialPhase.links.linkedin.ariaLabel}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={iconLinkStyle}
                >
                  <img src="/linkedin.svg" alt="LinkedIn" style={{ width: '18px', height: '18px', display: 'block' }} />
                </a>
                <a
                  href={content.development.radialPhase.links.github.url}
                  aria-label={content.development.radialPhase.links.github.ariaLabel}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={iconLinkStyle}
                >
                  <img src="/github_light.svg" alt="GitHub" style={{ width: '18px', height: '18px', display: 'block' }} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Related Publication */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h6 style={columnTitleStyle}>{content.relatedPublication.title}</h6>
          <p style={bodyTextStyle}>
            {content.relatedPublication.citation}
            <br />
            {content.relatedPublication.availableIn}
            <a href={content.relatedPublication.url} target="_blank" rel="noopener noreferrer">
              {content.relatedPublication.linkText}
            </a>
          </p>
        </div>

        {/* Column 3: Models */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h6 style={columnTitleStyle}>{content.models.title}</h6>
          <p style={bodyTextStyle}>
            {content.models.acidCorrelationLabel}
            <strong>Perry, R. H.</strong> (1934). <em>Perry&apos;s Chemical Engineers&apos; Handbook.</em>
          </p>
          <p style={bodyTextStyle}>
            {content.models.pvbtModelLabel}
            <strong>Ali, M., &amp; Ziauddin, M.</strong> (2020).{' '}
            <em>Carbonate acidizing: A mechanistic model for wormhole growth in linear and radial flow. Journal of Petroleum Science and Engineering</em>, 2020.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--color-divider)', paddingTop: '22px' }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-neutral-700)', textAlign: 'center' }}>
          {content.copyright}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <a
            href={content.bottomLinks.linkedin.url}
            aria-label={content.bottomLinks.linkedin.ariaLabel}
            target="_blank"
            rel="noopener noreferrer"
            style={iconLinkStyle}
          >
            <img src="/linkedin.svg" alt="LinkedIn" style={{ width: '18px', height: '18px', display: 'block' }} />
          </a>
          <a
            href={content.bottomLinks.github.url}
            aria-label={content.bottomLinks.github.ariaLabel}
            target="_blank"
            rel="noopener noreferrer"
            style={iconLinkStyle}
          >
            <img src="/github_light.svg" alt="GitHub" style={{ width: '18px', height: '18px', display: 'block' }} />
          </a>
        </div>
      </div>
    </footer>
  );
}
