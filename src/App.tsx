import SimuSetupCard from "./components/SimuCard"
import ChartComponent from "./components/Chart"
import Sidebar from "./components/SideBar"
import ResultTab from "./components/Results"
import ExpSection from "./components/ExpPoints"
import OptimalAnalysis from "./components/OptimumAnalysis"
import AboutSection from "./components/AboutSection"
import { useSelector } from "react-redux"
import { RootState } from "./redux/store"
import LoginScreen from "./components/Login"
import FooterSection from "./components/Footer"
import { useState } from "react"

function App() {
  const user = useSelector((state:RootState)=> state.user)
  const [currentTab, setCurrentTab] = useState('runner');

  return (
    <>
        <div style={{ display: 'grid', gridTemplateColumns: '208px minmax(0, 1fr)', minWidth: '1380px', minHeight: '100vh', fontFamily: 'var(--font-body)', color: 'var(--color-text)' }}>
          <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
          
          {currentTab === 'runner' ? (
            <main style={{ display: 'grid', gridTemplateColumns: 'minmax(560px, 0.92fr) minmax(660px, 1.08fr)', gap: '26px', padding: '26px 30px 34px', alignContent: 'start', backgroundColor: 'var(--color-bg)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', minWidth: 0 }}>
                <SimuSetupCard/>
                <ExpSection/>
                <OptimalAnalysis/>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', minWidth: 0, borderRadius: '9px', height: 0, minHeight: '100%' }}>
                <ChartComponent />
                <ResultTab/>
              </div>
            </main>
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
