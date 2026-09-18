import SimuSetupCard from "./components/SimuCard"
import AdjustedParametersCard from "./components/AdjustedParameters"
import ChartComponent from "./components/Chart"
import Sidebar from "./components/SideBar"
import ResultTab from "./components/Results"
import ExpSection from "./components/ExpPoints"
import OptimalAnalysis from "./components/OptimumAnalysis"
import AboutSection from "./components/AboutSection"
import FooterSection from "./components/Footer"
import { useState } from "react"
import { useSelector } from "react-redux"
import { RootState } from "./redux/store"

function App() {
  const [currentTab, setCurrentTab] = useState('runner');
  const flowRegime = useSelector((state: RootState) => state.radial.flowRegime);

  return (
    <>
        <div className="flex flex-col xl:grid xl:grid-cols-[208px_minmax(0,1fr)] min-h-screen" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text)' }}>
          <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

          {currentTab === 'runner' ? (
            flowRegime === 'radial' ? (
              <main className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 content-start bg-[var(--color-bg)]">
                <SimuSetupCard />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', minWidth: 0, borderRadius: '9px' }}>
                  <ChartComponent />
                </div>
                <AdjustedParametersCard />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', minWidth: 0, borderRadius: '9px' }}>
                  <ResultTab />
                </div>
                <ExpSection />
                <OptimalAnalysis />
              </main>
            ) : (
              <main className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 content-start bg-[var(--color-bg)] lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', minWidth: 0 }}>
                  <SimuSetupCard />
                  <AdjustedParametersCard />
                  <ExpSection />
                  <OptimalAnalysis />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', minWidth: 0, borderRadius: '9px', height: 0, minHeight: '100%' }}>
                  <ChartComponent />
                  <ResultTab />
                </div>
              </main>
            )
          ) : (
            <main style={{ backgroundColor: 'var(--color-bg)' }}>
              <AboutSection />
            </main>
          )}

          <FooterSection/>
        </div>
    </>
  )
}

export default App
