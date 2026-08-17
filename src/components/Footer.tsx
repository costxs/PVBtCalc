export default function FooterSection() {
  return (
    <footer style={{ gridColumn: '1 / -1', background: '#fff', borderTop: '1px solid var(--color-accent-300)', padding: '26px 30px 30px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-neutral-700)' }}>© 2025 Luiz Valente. Web application developed as a Final Graduation Project. All rights reserved.</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="https://www.linkedin.com/in/luiz-valente/" aria-label="LinkedIn" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid var(--color-accent-300)', borderRadius: 'var(--radius-sm)', color: 'var(--color-accent-800)' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect width="4" height="12" x="2" y="9"></rect><circle cx="4" cy="4" r="2"></circle></svg>
          </a>
          <a href="https://github.com/ByteAngler" aria-label="GitHub" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '1px solid var(--color-accent-300)', borderRadius: 'var(--radius-sm)', color: 'var(--color-accent-800)' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 4 5 4 5 4c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 11c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
          </a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '30px', borderTop: '1px solid var(--color-divider)', paddingTop: '22px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h6 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent-800)' }}>Financial Support</h6>
          <p style={{ margin: 0, fontSize: '12.5px', lineHeight: '1.55', color: 'var(--color-neutral-800)', textWrap: 'pretty' }}>This project was partially funded by <a href="#petrobras">Petrobras</a> through <strong>project 2019/00154-4</strong>, entitled <strong>"Study of Carbonate Acidification Using Low Reactivity Systems."</strong></p>
          <h6 style={{ margin: '10px 0 0', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent-800)' }}>Development</h6>
          <p style={{ margin: 0, fontSize: '12.5px', lineHeight: '1.55', color: 'var(--color-neutral-800)', textWrap: 'pretty' }}>Luiz Guilherme Valente Cardoso, Cláudio Regis dos Santos Lucas, Pedro Tupã Pandava Aum,<br />Laboratório de Ciência e Engenharia de Petróleo (LCPETRO), Universidade Federal do Pará (UFPA)</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h6 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent-800)' }}>Related Publication</h6>
          <p style={{ margin: 0, fontSize: '12.5px', lineHeight: '1.55', color: 'var(--color-neutral-800)', textWrap: 'pretty' }}>CARDOSO, Luiz Guilherme Valente et al. Desenvolvimento de Um Software In House para Análise do Pore Volume To Breakthrough (PVBt) na Estimulação Ácida em Carbonatos. In: ANAIS DO 11º CONGRESSO BRASILEIRO DE PETRÓLEO E GáS, 2022, Belém. Anais eletrônicos, Galoá, 2022.<br />Avaliable in: <a href="https://proceedings.science/pdpetro-2022/trabalhos/desenvolvimento-de-um-software-in-house-para-analise-do-pore-volume-to-breakthro?lang=pt-br" target="_blank" rel="noreferrer">Anais do 11º Congresso Brasileiro de Petróleo e Gás</a></p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h6 style={{ margin: 0, fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent-800)' }}>Models</h6>
          <p style={{ margin: 0, fontSize: '12.5px', lineHeight: '1.55', color: 'var(--color-neutral-800)', textWrap: 'pretty' }}>Acid corelation: <strong>Perry, R. H.</strong> (1934). <em>Perry's Chemical Engineers' Handbook.</em></p>
          <p style={{ margin: 0, fontSize: '12.5px', lineHeight: '1.55', color: 'var(--color-neutral-800)', textWrap: 'pretty' }}>PVBt Model: <strong>Ali, M., &amp; Ziauddin, M.</strong> (2020). <em>Carbonate acidizing: A mechanistic model for wormhole growth in linear and radial flow. Journal of Petroleum Science and Engineering</em>, 2020.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '34px', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid var(--color-divider)', paddingTop: '22px' }}>
        <div style={{ width: '150px', height: '78px' }}><img src="/image.png" alt="UFPA" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
        <div style={{ width: '150px', height: '78px' }}><img src="/lcpetro_novo.png" alt="LCPetro" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
        <div style={{ width: '150px', height: '78px' }}><img src="/labx.png" alt="LabX" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
      </div>
    </footer>
  )
}