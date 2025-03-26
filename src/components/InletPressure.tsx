import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";

export default function InletSection(){
    const {core_diameter, core_length} = useSelector((state:RootState)=>state.setup)
    const [mi, setMi] = useState<number>(0);
    const [k, setK] = useState<number>(0);
    const [q0max, setQ0max] = useState<number>(0);
    const [backPressure, setBackPressure] = useState<number>(0);
    const [inletPressure, setInletPressure] = useState<number>(0);


    const calculatePressure = () => {
        const radius = core_diameter / 2;
        const area = Math.PI * Math.pow(radius, 2);
        const deltap = (q0max * mi * core_length) / (k * area);
        const iPValue = Number(deltap) + Number(backPressure);
        console.log(backPressure)
        console.log(deltap)
        console.log(iPValue)
        setInletPressure(iPValue);
      };
    return(
        <>
            <div className="space-y-[0.5vw] font-semibold">
                <label htmlFor="">Flowrate, (cm³/min)</label>
                <input type="text" className="bg-slate-700 text-white p-2 w-full shadow-md rounded" value={q0max} onChange={(e)=>setQ0max(e.target.value as any)} />
                <label htmlFor="">Viscosity, cP</label>
                <input type="text" className="bg-slate-700 text-white p-2 w-full shadow-md rounded" value={mi} onChange={(e)=>setMi(e.target.value as any)}/>
                <label htmlFor="">Permeability, mD</label>
                <input type="text" className="bg-slate-700 text-white p-2 w-full shadow-md rounded" value={k} onChange={(e)=>setK(e.target.value as any)}/>
                <label htmlFor="">Backpressure, psi</label>
                <input type="text" className="bg-slate-700 text-white p-2 w-full shadow-md rounded" value={backPressure} onChange={(e)=>setBackPressure(e.target.value as any)}/>
                <button className="p-2 bg-lime-600 shadow-md rounded w-full cursor-pointer hover:scale-105 active:scale-100" onClick={calculatePressure}>Estimate Inlet Pressure</button>
                <div>Inlet Pressure: {inletPressure? Number(inletPressure).toFixed(3):0}</div>
            </div>
        </>
    )
}