import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { sobreOModeloStyles } from './primitives';
import ContentPt from './content.pt';
import ContentEn from './content.en';

const SobreOModelo: React.FC = () => {
  const language = useSelector((state: RootState) => state.ui.language);

  return (
    <section style={{ padding: '30px 40px', overflowY: 'auto', maxHeight: '100%', flex: 1 }}>
      <style>{sobreOModeloStyles}</style>

      <div className="som-content" style={{ color: 'var(--color-neutral-800)', lineHeight: '1.7', fontSize: '15px' }}>
        {language === 'pt' ? <ContentPt /> : <ContentEn />}
      </div>
    </section>
  );
};

export default SobreOModelo;
