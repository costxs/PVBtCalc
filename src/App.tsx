import RockCard from "./components/RockParam"
import SimuSetupCard from "./components/SimuCard"
import ChartComponent from "./components/Chart"
import Sidebar from "./components/SideBar"
import ResultTab from "./components/Results"
import ExpSection from "./components/ExpPoints"
import OptimalAnalysis from "./components/OptimumAnalysis"
function App() {

  return (
    <div className="bg-gray-100 text-[0.833vw]">
      <div className="flex h-[100vh]">
        <div className="h-full">
          <Sidebar/>
        </div>
        <div className="flex space-x-5 p-5">
          <div className="w-1/2 flex flex-col justify-center space-y-8">
            <div className="flex max-w-full bg-slate-400 rounded">
              <div className="w-1/3 h-full">
                <RockCard/>
              </div>
              <div className="w-2/3 h-full">
                <SimuSetupCard/>
              </div>
            </div>
            <div className="h-[45%] flex bg-slate-400 divide-x p-2 rounded opacity-40 pointer-events-none" aria-disabled={true}>
              <ExpSection/>
              <OptimalAnalysis/>
            </div>
          </div>
          <div className="w-1/2 p-5 bg-slate-300 shadow-md border">
            <div className="shadow-md">
                <ChartComponent />
            </div>
            <div className="h-2/5 border-blue-600">
              <ResultTab/>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
