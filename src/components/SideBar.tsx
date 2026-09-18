import { RootState } from "../redux/store";
import { useDispatch, useSelector } from "react-redux";
import { setLanguage } from "../redux/ui/slice"

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const language = useSelector((state: RootState) => state.ui.language)
  const isPt = language === 'pt'
  const dispatch = useDispatch()

  const toggleLanguage = () => dispatch(setLanguage(isPt ? 'en' : 'pt'))
  return (
    <aside style={{ background: 'var(--color-accent-900)', color: '#eef1f4', display: 'flex', flexDirection: 'column', padding: '22px 18px 18px' }}>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '30px', letterSpacing: '-0.01em', lineHeight: 1 }}>
        PVBt<span style={{ color: 'var(--color-accent-400)' }}>Calc</span>
      </div>
      <div style={{ font: '400 10px/1.4 var(--font-body)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(238, 241, 244, 0.5)', marginTop: '6px' }}>Acid Core Flooding</div>

      <svg viewBox="0 0 150 44" style={{ width: '100%', height: '40px', margin: '18px 0 26px', overflow: 'visible' }}>
        <path d="M4 4 C 30 40, 60 42, 78 30 C 100 15, 124 8, 146 6" fill="none" stroke="#94bce3" strokeWidth="1.6"></path>
        <circle cx="78" cy="30" r="3" fill="none" stroke="#94bce3" strokeWidth="1.2"></circle>
      </svg>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <a href="#runner" onClick={(e) => { e.preventDefault(); setCurrentTab('runner'); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', textDecoration: 'none', color: currentTab === 'runner' ? '#fff' : 'rgba(238, 241, 244, 0.72)', background: currentTab === 'runner' ? 'rgba(148, 188, 227, 0.16)' : 'transparent', borderLeft: `2px solid ${currentTab === 'runner' ? 'var(--color-accent-400)' : 'transparent'}`, fontFamily: 'var(--font-heading)', fontSize: '15px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"></path><path d="M14 9.3V1.99"></path><path d="M8.5 2h7"></path><path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path><path d="M5.58 16.5h12.85"></path></svg>
          Runner
        </a>
        <a href="#export" onClick={(e) => { e.preventDefault(); setCurrentTab('export'); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', textDecoration: 'none', color: currentTab === 'export' ? '#fff' : 'rgba(238, 241, 244, 0.72)', background: currentTab === 'export' ? 'rgba(148, 188, 227, 0.16)' : 'transparent', borderLeft: `2px solid ${currentTab === 'export' ? 'var(--color-accent-400)' : 'transparent'}`, fontFamily: 'var(--font-heading)', fontSize: '15px', letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v5h6"></path><path d="M12 18v-6"></path><path d="m9 15 3 3 3-3"></path></svg>
          Export
        </a>
        <a href="#about" onClick={(e) => { e.preventDefault(); setCurrentTab('about'); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', textDecoration: 'none', color: currentTab === 'about' ? '#fff' : 'rgba(238, 241, 244, 0.72)', background: currentTab === 'about' ? 'rgba(148, 188, 227, 0.16)' : 'transparent', borderLeft: `2px solid ${currentTab === 'about' ? 'var(--color-accent-400)' : 'transparent'}`, fontFamily: 'var(--font-heading)', fontSize: '15px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
          {isPt ? 'Sobre o Modelo' : 'About the Model'}
        </a>
        <button
          type="button"
          onClick={toggleLanguage}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', margin: '2px 0 0', border: 'none', background: 'transparent', color: 'rgba(238, 241, 244, 0.72)', fontFamily: 'var(--font-heading)', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8l6 6"></path><path d="M4 14l6-6 2-3"></path><path d="M2 5h12"></path><path d="M7 2h1"></path><path d="M22 22l-5-10-5 10"></path><path d="M14 18h6"></path></svg>
          {isPt ? 'Translate to English' : 'Traduzir para Português'}
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;
