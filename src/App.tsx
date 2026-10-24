import SimuSetupCard from "./components/SimuCard"
import AdjustedParametersCard from "./components/AdjustedParameters"
import ChartComponent from "./components/Chart"
import Sidebar from "./components/SideBar"
import ResultTab from "./components/Results"
import ExpSection from "./components/ExpPoints"
import OptimalAnalysis from "./components/OptimumAnalysis"
import SobreOModelo from "./components/SobreOModelo"
import ExportTab from "./components/ExportTab"
import SimulationPersistence from "./components/SimulationPersistence"
import AdminPanel from "./components/AdminPanel"
import FooterSection from "./components/Footer"
import LoginScreen from "./components/Login"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { AppDispatch, RootState } from "./redux/store"
import { restoreSession } from "./redux/user/slice"

function App() {
  const [currentTab, setCurrentTab] = useState('runner');
  const dispatch = useDispatch<AppDispatch>();
  const { profile, ready } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  if (!ready) return null;
  if (!profile) return <LoginScreen />;

  return (
    <>
        <SimulationPersistence />
        <div className="flex flex-col xl:grid xl:grid-cols-[208px_minmax(0,1fr)] min-h-screen" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text)' }}>
          <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

          {currentTab === 'runner' ? (
            <main className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 content-start bg-[var(--color-bg)] lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', minWidth: 0 }}>
                <SimuSetupCard />
                <AdjustedParametersCard />
                <ExpSection />
                <OptimalAnalysis />
              </div>
              <div className="lg:h-0 lg:min-h-full" style={{ display: 'flex', flexDirection: 'column', gap: '26px', minWidth: 0, borderRadius: '9px' }}>
                <ChartComponent />
                <ResultTab />
              </div>
            </main>
          ) : currentTab === 'export' ? (
            <main style={{ backgroundColor: 'var(--color-bg)' }}>
              <ExportTab onGoToRunner={() => setCurrentTab('runner')} />
            </main>
          ) : currentTab === 'admin' && profile.is_admin ? (
            <main style={{ backgroundColor: 'var(--color-bg)' }}>
              <AdminPanel />
            </main>
          ) : (
            <main style={{ backgroundColor: 'var(--color-bg)' }}>
              <SobreOModelo />
            </main>
          )}

          <FooterSection/>
        </div>
    </>
  )
}

export default App
