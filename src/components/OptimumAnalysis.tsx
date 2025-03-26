import { useDispatch, useSelector } from "react-redux"
import { RootState } from "../redux/store"
import { setAnalitical, setParam, setflowrate } from "../redux/optsetup/slice"
import { fetchAnalitical } from "../redux/analysisresults/slice"
import { useState } from "react"
import {setParameter} from "../redux/setup/slice";

export default function OptimalAnalysis(){
    const dispatch = useDispatch()
    const [selectedParam, setSelectedParam] = useState()
    const handleAnalitical = () => {
        dispatch(setParameter({key:dic[analitical_param],value: selectedParam}))
        dispatch(fetchAnalitical() as any)
    }
    const dic: { [key: string]: string } = {
        'temperature':'temperature',
        'core length':'core_length',
        'core diameter':'core_diameter',
        'core porosity':'core_porosity',
        'acid concentration':'acid_concentration'
    }


    const {analitical_param, minimum_analitical, flowrate} = useSelector((state:RootState)=>state.optSetup)
    return(
        <>
            <div className="w-full h-full bg-slate-400 rounded-sm p-[0.6vw] flex flex-col justify-between">
                <p className="text-[1.2vw] font-bold">Optimum Analysis</p>
                <div className="flex flex-col space-y-2">
                    <div className="flex flex-col space-y-0.5">
                        <label htmlFor="" className="font-semibold ps-2">Select a Parameter</label>
                        <select name="optimum" value={analitical_param} onChange={e=>dispatch(setParam(e.target.value))} id="" className="bg-white rounded p-[0.7vh] font-bold">
                            <option value="temperature">Temperature, (Cº)</option>
                            <option value="core length">Core Length, (Inch)</option>
                            <option value="core diameter">Core Diameter, (Inch)</option>
                            <option value="core porosity">Core Porosity, (Fraction)</option>
                            <option value="acid concentration">Acid Concentration, (Fraction)</option>
                        </select>
                    </div>
                    <div className="flex space-x-[1vw]">
                        <div className="flex justify-around">
                            <input type="number" value={minimum_analitical as any} onChange={e=>dispatch(setAnalitical(e.target.value))} className="bg-slate-700 text-white p-[0.7vh] shadow-md w-full rounded" placeholder="Minimum"/>
                        </div>
                        <div className="flex justify-around">
                            <input type="number" value={selectedParam} onChange={e=>setSelectedParam(e.target.value as any)} className="bg-slate-700 text-white p-[0.7vh] shadow-md w-full rounded" placeholder="Maximum"/>
                        </div>

                    </div>
                    <div className=" flex flex-col">
                        <label htmlFor="" className="font-semibold">Flowrate (cm³/min)</label>
                        <input type="number" value={flowrate as any} onChange={e=>dispatch(setflowrate(e.target.value))} className="bg-slate-700 text-white p-[0.7vh] shadow-md rounded" placeholder="cm³/min"/>
                    </div>
                </div>
                <p className="font-bold text-blue-800">
                    *The others parameters are reflected by the runner setup
                </p>
                <div className="">
                    <button className={`p-[0.7vh] text-[0.9vw] w-full font-semibold border rounded shadow-md bg-sky-500 ${(minimum_analitical as any === '0' || minimum_analitical === null)?'opacity-50':'cursor-pointer'}`} disabled={(minimum_analitical as any === '0' || minimum_analitical === null)? true : false} onClick={handleAnalitical}>Analyse</button>
                </div>
            </div>
        </>
    )
}