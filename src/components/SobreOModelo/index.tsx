import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { sobreOModeloStyles } from './primitives';
import ContentPt from './content.pt';
import ContentEn from './content.en';
import { useT } from '../../i18n';
import { useTour } from '../../tour/tourContext';
import type { TourTrack } from '../../tour/types';

const TRACKS: { track: TourTrack; label: 'tour.track_linear' | 'tour.track_radial' | 'tour.track_export' }[] = [
  { track: 'linear', label: 'tour.track_linear' },
  { track: 'radial', label: 'tour.track_radial' },
  { track: 'export', label: 'tour.track_export' },
];

const SobreOModelo: React.FC = () => {
  const language = useSelector((state: RootState) => state.ui.language);
  const { t } = useT();
  const { startTour } = useTour();

  return (
    <section style={{ padding: '30px 40px', overflowY: 'auto', maxHeight: '100%', flex: 1 }}>
      <style>{sobreOModeloStyles}</style>

      <div style={{ maxWidth: '820px', margin: '0 0 28px', padding: '14px 18px', border: '1px solid var(--color-divider)', borderRadius: '9px', background: '#fff' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-accent-900)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('tour.walkthroughs_title')}
        </div>
        <p className="text-muted" style={{ margin: '4px 0 10px', fontSize: '12.5px' }}>{t('tour.walkthroughs_intro')}</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {TRACKS.map(({ track, label }) => (
            <button key={track} type="button" className="btn" style={{ fontSize: '12.5px', padding: '6px 12px', borderRadius: '7px' }} onClick={() => startTour(track)}>
              {t(label)}
            </button>
          ))}
        </div>
      </div>

      <div className="som-content" style={{ color: 'var(--color-neutral-800)', lineHeight: '1.7', fontSize: '15px' }}>
        {language === 'pt' ? <ContentPt /> : <ContentEn />}
      </div>
    </section>
  );
};

export default SobreOModelo;
