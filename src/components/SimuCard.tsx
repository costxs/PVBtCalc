import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../redux/store";
import {setParameter, resetParameter} from "../redux/setup/slice";
import { fetchCurve, setId, setSystem } from "../redux/results/slice";
import { addCurve } from "../redux/storageresults/slice";
import { fetchParam } from "../redux/parameters/slice";
import { useEffect } from "react";
import { RxCursorArrow } from "react-icons/rx";
export default function SimuSetupCard(){
    
    const getLegen = (key: string)=>{
        switch(key){
            case('ro'):
                return 'Acid Density';
            case('X'):
                return 'Acid Volumetric Dissolving Power, 100% HCl';
            case('x'):
                return 'Acid Volumetric Dissolving Power, fraction HCl';
            case('n'):
                return 'Enhanced Permeability Area Factor';
            case('a'):
                return 'Enhanced Permeability Zone Flow Coefficient';
            case('b'):
                return 'Wormhole Flow Coefficient';
            case('k0'):
                return 'Mass Transfer Coefficient Static Constant';
            default: 
                return ''

        }
    }
    const {flowrate: iflowrate, minimum_flowrate: fflowrate, acid_concentration: aConcentration, temperature, acid_type: acidType, step_numbers, id, rock_type} = useSelector((state:RootState)=> state.setup)
    const dataCurve = useSelector((state:RootState)=>state.results)
    const dispatch = useDispatch()

    const data = useSelector((state:RootState)=>state.parameters)
    const {ids} = useSelector((state:RootState)=> state.resultCurves)
    const handleCurve =  () => {
        dispatch(setId(id));
        dispatch(setSystem({acid:acidType, rock: rock_type}))
        dispatch((fetchCurve() as any));
        dispatch((fetchParam() as any));
        

    };
    const handleReset = () =>{
        dispatch(resetParameter());
    }

    useEffect(()=>{
        
        if(dataCurve.processed && dataCurve.id){
            dispatch(addCurve(dataCurve));
        }
    },[dataCurve.processed]);
    const handleParam = (dic:any) =>{
        dispatch(setParameter(dic));
        if (temperature === 0){
            return
        }
        if (aConcentration === 0){
            return
        }
        dispatch((fetchParam() as any));
    }
    return(
        <div className="bg-slate-400 rounded-sm p-4 h-max-full">
            <div className="flex space-x-5">
                
                <div>
                    <div className=" space-y-2 border-r border-dashed pe-5">
                        <div>
                            <label htmlFor="" className=" font-semibold">Simu ID</label>
                            <input type="text" className="inset-shadow-sm inset-shadow-gray-700/50 w-full bg-gray-100 shadow-sm rounded-sm font-semibold text-blue-600 p-1" value={id} onChange={(e)=>dispatch(setParameter({key:'id',value:e.target.value}))}/>
                        </div>
                        <div className="flex w-full space-x-3 font-semibold">
                            <button className={`rounded bg-green-500  p-1 shadow-lg   ${id?(ids.includes(id)?'opacity-60':'cursor-pointer hover:scale-105 hover:bg-green-400'):'opacity-60'}`} disabled={id?(ids.includes(id)?true:false):true} onClick={handleCurve}>Calculate!</button>
                            <button className="rounded bg-yellow-600 p-1 shadow-lg cursor-pointer hover:scale-105 text-nowrap" onClick={handleReset}>Reset Parameters</button>
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="" className="font-semibold">Flowrate</label>
                            <div className="flex items-center justify-between space-x-1">
                                <input type="number" className="bg-slate-700 text-white p-2 shadow-md rounded w-6/12" placeholder="Initial" value={iflowrate} onChange={(e)=>dispatch(setParameter({key:'flowrate',value:e.target.value}))}/>
                                <p></p>
                                <input type="number" className="bg-slate-700 text-white p-2 shadow-md rounded w-6/12" placeholder="Final" value={fflowrate} onChange={(e)=>dispatch(setParameter({key:'minimum_flowrate',value:e.target.value}))}/>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="" className="flex w-full text-nowrap space-x-0.5"><p>Number of Steps:</p> <div><input type="number" className="w-1/2 font-bold" value={step_numbers} max={200} onChange={(e)=>dispatch(setParameter({key:'step_numbers',value:e.target.value}))}/></div></label>
                            <input type="range" value={step_numbers} onChange={(e)=>dispatch(setParameter({key:'step_numbers',value:e.target.value}))} max={200} className="w-full"/>
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="" className="font-semibold">Acid System</label>
                            <select name="" id="" className="bg-gray-200 p-2 font-semibold shadow-sm rounded-sm" value={acidType} onChange={(e)=>handleParam({key:'acid_type',value:e.target.value})}>
                                <option value="HCl">HCl</option>
                                <option value="HCl With Inibithor Corrosion">HCl With Inibithor Corrosion</option>
                                <option value="HCl Emulsified">HCl Emulsified</option>
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="" className="font-semibold">Acid Concentration</label>
                            <input type="number" className="bg-slate-700 text-white p-2 shadow-md rounded" min={0} placeholder="Fraction" value={aConcentration} onChange={(e)=>handleParam({key:'acid_concentration',value:e.target.value})}/>
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="" className="font-semibold">System Temperature</label>
                            <input type="number" className="bg-slate-700 text-white p-2 shadow-md rounded" placeholder="ºC" value={temperature} onChange={(e)=>handleParam({key:'temperature',value:e.target.value})}/>
                        </div>

                    </div>
                </div>
                <div className="flex flex-col justify-center items-center h-full w-full">

                    <span className="uppercase border-b mb-5 font-bold mt-5">Adjusted Parameters</span>
                    <div className="w-full">
                        <table className=" w-full">
                            <thead>
                                <tr className="px-3 py-2 ">
                                    <th>Parameter</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(data).map(([key, value], rowIndex) => ( 
                                <tr key={rowIndex} className="border-b border-gray-600 text-center">
                                    <td className="px-3 py-[1vh] font-bold cursor-help" title={getLegen(key)}>{key}</td>
                                    <td className={`px-3 py-[1vh] ${typeof value === "number" ? "text-blue-600 font-semibold" : "font-bold"}`}>
                                    {value? (Math.abs(value) < 0.001 || Math.abs(value) > 1_000 ? value.toExponential(2) :value.toFixed(4)):0}
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <p className="text-[0.7vw] pt-[1vh] text-center">for more information on the description of variables, position the cursor <RxCursorArrow className="inline"/> over them</p><div></div>                
                    </div>
                </div>
            </div>
        </div>
    )
}