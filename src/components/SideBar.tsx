import { useState } from "react";
import { useT } from "../i18n";
import { useDispatch, useSelector } from "react-redux";
import { setLanguage } from "../redux/ui/slice";
import { logout } from "../redux/user/slice";
import { AppDispatch, RootState } from "../redux/store";
import FeedbackModal from "./FeedbackModal";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { t, lang } = useT();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const { username, profile } = useSelector((state: RootState) => state.user);

  const toggleLanguage = () => dispatch(setLanguage(lang === 'pt' ? 'en' : 'pt'));
  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <>
      <aside style={{ background: 'var(--color-accent-900)', color: '#eef1f4', display: 'flex', flexDirection: 'column', padding: '22px 18px 18px' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '30px', letterSpacing: '-0.01em', lineHeight: 1 }}>
          PVBt<span style={{ color: 'var(--color-accent-400)' }}>Calc</span>
        </div>
        <div style={{ font: '400 10px/1.4 var(--font-body)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(238, 241, 244, 0.5)', marginTop: '6px' }}>{t('side.tagline')}</div>

        <svg viewBox="0 0 150 44" style={{ width: '100%', height: '40px', margin: '18px 0 26px', overflow: 'visible' }}>
          <path d="M4 4 C 30 40, 60 42, 78 30 C 100 15, 124 8, 146 6" fill="none" stroke="#94bce3" strokeWidth="1.6"></path>
          <circle cx="78" cy="30" r="3" fill="none" stroke="#94bce3" strokeWidth="1.2"></circle>
        </svg>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <a href="#runner" onClick={(e) => { e.preventDefault(); setCurrentTab('runner'); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', textDecoration: 'none', color: currentTab === 'runner' ? '#fff' : 'rgba(238, 241, 244, 0.72)', background: currentTab === 'runner' ? 'rgba(148, 188, 227, 0.16)' : 'transparent', borderLeft: `2px solid ${currentTab === 'runner' ? 'var(--color-accent-400)' : 'transparent'}`, fontFamily: 'var(--font-heading)', fontSize: '15px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"></path><path d="M14 9.3V1.99"></path><path d="M8.5 2h7"></path><path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path><path d="M5.58 16.5h12.85"></path></svg>
            {t('side.runner')}
          </a>
          <a href="#export" onClick={(e) => { e.preventDefault(); setCurrentTab('export'); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', textDecoration: 'none', color: currentTab === 'export' ? '#fff' : 'rgba(238, 241, 244, 0.72)', background: currentTab === 'export' ? 'rgba(148, 188, 227, 0.16)' : 'transparent', borderLeft: `2px solid ${currentTab === 'export' ? 'var(--color-accent-400)' : 'transparent'}`, fontFamily: 'var(--font-heading)', fontSize: '15px', letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v5h6"></path><path d="M12 18v-6"></path><path d="m9 15 3 3 3-3"></path></svg>
            {t('common.export')}
          </a>
          <a href="#about" onClick={(e) => { e.preventDefault(); setCurrentTab('about'); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', textDecoration: 'none', color: currentTab === 'about' ? '#fff' : 'rgba(238, 241, 244, 0.72)', background: currentTab === 'about' ? 'rgba(148, 188, 227, 0.16)' : 'transparent', borderLeft: `2px solid ${currentTab === 'about' ? 'var(--color-accent-400)' : 'transparent'}`, fontFamily: 'var(--font-heading)', fontSize: '15px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            {t("sidebar.about_the_model")}
          </a>
          <button
            type="button"
            onClick={() => setIsFeedbackOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', border: 'none', background: 'transparent', borderLeft: '2px solid transparent', color: 'rgba(238, 241, 244, 0.72)', fontFamily: 'var(--font-heading)', fontSize: '15px', letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left', width: '100%' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            {t("sidebar.feedback")}
          </button>
          <button
            type="button"
            onClick={toggleLanguage}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', margin: '2px 0 0', border: 'none', background: 'transparent', color: 'rgba(238, 241, 244, 0.72)', fontFamily: 'var(--font-heading)', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'left' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8l6 6"></path><path d="M4 14l6-6 2-3"></path><path d="M2 5h12"></path><path d="M7 2h1"></path><path d="M22 22l-5-10-5 10"></path><path d="M14 18h6"></path></svg>
            {t("sidebar.traduzir_para_portugues")}
          </button>
          {profile?.is_admin && (
            <a href="#admin" onClick={(e) => { e.preventDefault(); setCurrentTab('admin'); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', textDecoration: 'none', color: currentTab === 'admin' ? '#fff' : 'rgba(238, 241, 244, 0.72)', background: currentTab === 'admin' ? 'rgba(148, 188, 227, 0.16)' : 'transparent', borderLeft: `2px solid ${currentTab === 'admin' ? 'var(--color-accent-400)' : 'transparent'}`, fontFamily: 'var(--font-heading)', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              {t("sidebar.admin")}
            </a>
          )}

          <div style={{ marginTop: '10px', paddingTop: '12px', borderTop: '1px solid rgba(238, 241, 244, 0.16)', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '10px', paddingRight: '6px' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ font: '400 10px/1.3 var(--font-body)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(238, 241, 244, 0.5)' }}>
                {t("sidebar.user_label")}
              </div>
              <div style={{ fontSize: '13px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={profile?.email || username || ''}>
                {username || profile?.email || 'lcpetro.lab'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: '1px solid rgba(238, 241, 244, 0.3)',
                background: 'rgba(238, 241, 244, 0.06)',
                color: 'rgba(238, 241, 244, 0.88)',
                fontFamily: 'var(--font-heading)',
                fontSize: '12px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '6px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              {t("sidebar.logout")}
            </button>
          </div>
        </nav>
      </aside>
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </>
  );
};

export default Sidebar;
