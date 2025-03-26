import { useState } from "react"
import { addCurve } from "../redux/storageresults/slice";
import {useSelector, useDispatch } from "react-redux";
import { RootState } from "../redux/store";
import type {Curve} from '../redux/storageresults/slice'

export default function ExpSection(){
    const {ids} = useSelector((state:RootState)=>state.resultCurves)
    const dispatch = useDispatch()
    const headers = ["q0","PVBt"]
    const [currentPVBt, setCurrentPVBt] = useState('');
    const [currentFlow, setCurrentFlow] = useState('');
    const [currentID, setCurrentID] = useState('');
    const [expCurve, setExpCurve] = useState<Curve>({
        id: 'Exp:',
        acid: 'Experimental',
        rock: 'Experimental',
        pvbtPoints: [],
        flowratePoints: [],
        intersticialVelocity: [],
        iDa: [],
        volumeToBt: [],
        timeToBt: [],
        wormholeVelocity: [],
        darcyVelocity: [],
    });
    const handleSetPoint = () => {
        expCurve.pvbtPoints.push(parseFloat(currentPVBt));
        expCurve.flowratePoints.push(parseFloat(currentFlow));
        expCurve.intersticialVelocity.push(0);
        expCurve.iDa.push(0);
        expCurve.volumeToBt.push(0);
        expCurve.timeToBt.push(0);
        expCurve.wormholeVelocity.push(0);
        expCurve.darcyVelocity.push(0);
        setCurrentFlow('');
        setCurrentPVBt('');
    };
    const validadeExport = () => {
        if ((currentID) && (expCurve.flowratePoints.length > 0)){
            if (ids.includes("Exp: " + currentID)){
                return false
            }
            else{
                return true
            }
        }
        else{
            return false
        }
    }
    const handleSetCurve = () => {
        expCurve.id = 'Exp: ' + currentID;
        dispatch(addCurve(expCurve));
        setCurrentID('');
        setExpCurve(
            {
                id: 'Exp:',
                acid: 'Experimental',
                rock: 'Experimental',
                pvbtPoints: [],
                flowratePoints: [],
                intersticialVelocity: [],
                iDa: [],
                volumeToBt: [],
                timeToBt: [],
                wormholeVelocity: [],
                darcyVelocity: [],
            }
        )
    }
    const data = expCurve.flowratePoints.map((flow, index) => [
        flow,
        expCurve.pvbtPoints[index] ?? ''
      ]);
    return(
        <>
            <div className="w-3/3 h-full bg-slate-400 p-[0.6vw] flex flex-col justify-between">
                <p className="text-[1.2vw] font-bold ">Plot Experimental Curves</p>
                <div className="flex flex-col items-center space-y-[2vh]">
                    <input type="text" value={currentID} onChange={(e)=> setCurrentID(e.target.value)} className="bg-slate-700 w-full text-white p-[0.7vh] shadow-md rounded" placeholder="id"/>
                    <div className="flex space-x-1.5">
                        <input type="number" value={currentFlow } onChange={(e)=> setCurrentFlow(e.target.value)} className="bg-slate-700 w-full text-white p-[0.7vh] shadow-md rounded" placeholder="Flowrate"/>
                        <input type="number" value={currentPVBt} onChange={(e)=> setCurrentPVBt(e.target.value)} className="bg-slate-700 w-full text-white p-[0.7vh] shadow-md rounded" placeholder="PVBt"/>
                    </div>
                    <button onClick={handleSetPoint} className={`border rounded-md bg-sky-400 shadow-md w-2/5 p-[0.5vw] ${(currentFlow && currentPVBt)?'':'opacity-50'}`} disabled={(currentFlow && currentPVBt)?false:true}>Add to Table</button>
                </div>
                <div className=" border overflow-y-auto max-h-[18%]">
                    <table className="border  border-gray-700 text-bla bg-gray-100 shadow-md min-w-full text-[0.8vw]">
                            <thead>
                            <tr className="bg-gray-300">
                                {headers.map((header, index) => (
                                <th key={index} className="border border-gray-700 px-[0.3vw] py-[0.4vh] text-center">
                                    {header}
                                </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {data.map((row, rowIndex) => (
                                <tr key={rowIndex} className="text-center">
                                {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="border border-gray-500 px-[0.3vw] py-[0.4vh]">
                                    {cell}
                                    </td>
                                ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                </div>
                
                <div className="">
                    <button onClick={handleSetCurve} className={`p-[0.7vh] text-[0.9vw] w-full font-semibold border rounded shadow-md bg-cyan-300 ${validadeExport()?'':'opacity-50'}`} disabled={!validadeExport}>Export Points to PVBt Chart</button>
                </div>
            </div>
        </>
    )
}