import { RootState } from "../redux/store";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../redux/user/slice"
import { useState } from "react";
import { Curve } from "../redux/storageresults/slice";
import exportCurveAsVerticalTable from "../tools/export";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { username } = useSelector((state: RootState) => state.user)
  const dispatch = useDispatch()
  const { ids, curves } = useSelector((state: RootState) => state.resultCurves)
  const [exp, setExp] = useState(false);
  const [curve, setCurve] = useState(null);

  const handleID = (id: string) => {
    setCurve((curves as any).find((c: Curve) => c.id === id));
  }
  const handleExport = () => {
    if (curve) {
      exportCurveAsVerticalTable(curve as any);
    }
    setExp(false);
  }

  const handleExp = (e: React.MouseEvent) => {
    e.preventDefault();
    setExp(true);
  }
  const handleLogout = () => {
    dispatch(logout())
  }
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
        <a href="#export" onClick={handleExp} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', textDecoration: 'none', color: 'rgba(238, 241, 244, 0.72)', borderLeft: '2px solid transparent', fontFamily: 'var(--font-heading)', fontSize: '15px', letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v5h6"></path><path d="M12 18v-6"></path><path d="m9 15 3 3 3-3"></path></svg>
          Export
        </a>
        <a href="#about" onClick={(e) => { e.preventDefault(); setCurrentTab('about'); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', textDecoration: 'none', color: currentTab === 'about' ? '#fff' : 'rgba(238, 241, 244, 0.72)', background: currentTab === 'about' ? 'rgba(148, 188, 227, 0.16)' : 'transparent', borderLeft: `2px solid ${currentTab === 'about' ? 'var(--color-accent-400)' : 'transparent'}`, fontFamily: 'var(--font-heading)', fontSize: '15px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
          Sobre o Modelo
        </a>
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ height: '1px', background: 'rgba(238, 241, 244, 0.16)' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <div style={{ font: '400 10px/1.3 var(--font-body)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(238, 241, 244, 0.5)' }}>User</div>
            <div style={{ fontSize: '13px', color: '#fff' }}>{username || 'lcpetro.lab'}</div>
          </div>
          <button className="btn btn-ghost" onClick={handleLogout} style={{ border: '1px solid rgba(238, 241, 244, 0.3)', color: 'rgba(238, 241, 244, 0.85)', fontSize: '12px', padding: '5px 10px', borderRadius: '9px', textDecoration: 'none' }}>Log out</button>
        </div>
      </div>

      <div className={`absolute top-[30%] px-[0.7vw] py-[2vh] space-y-[5vh] left-[30%] shadow-2xl rounded border-2 flex items-center flex-col bg-slate-300 min-w-[20vw] h-fit w-fit ${exp ? 'block' : 'hidden'}`} style={{ color: 'black', zIndex: 100 }}>
        <p className="font-semibold">Select a Curve and click to export</p>
        <ul className="w-full divide-y border">
          {ids.map((id) => (
            <li key={id} onClick={() => handleID(id)} className={`cursor-pointer font-semibold w-full p-[0.3vw] ${(curve ? ((curve as any).id === id ? 'bg-sky-500' : 'bg-white') : 'bg-white')}`}>{id}</li>
          ))}
        </ul>
        <div className="flex space-x-[0.5vw]">
          <button className="text-center w-6/12 p-[1vh] shadow-md rounded-md cursor-pointer hover:scale-105 active:scale-95 bg-lime-600 text-white" onClick={handleExport}>Export</button>
          <button className="text-center w-6/12 p-[1vh] shadow-md rounded-md cursor-pointer hover:scale-105 active:scale-95 bg-orange-600 text-white" onClick={() => setExp(false)}>Cancel</button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
