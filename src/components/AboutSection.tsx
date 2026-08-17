import React from 'react';

const AboutSection: React.FC = () => {
  return (
    <section className="blueprint" style={{ padding: '30px 40px', overflowY: 'auto', maxHeight: '100%', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', letterSpacing: '0.05em', color: 'var(--color-accent-900)' }}>
          Fundamentação Teórica e Modelagem Matemática
        </h2>
        <span style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }}></span>
      </div>

      <div style={{ color: 'var(--color-neutral-800)', lineHeight: '1.7', fontSize: '15px' }}>
      </div>
    </section>
  );
};

export default AboutSection;
