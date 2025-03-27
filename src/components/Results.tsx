import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../redux/store";
import { useEffect, useState } from "react";
import { removeCurve } from "../redux/storageresults/slice";
import exportCurveAsVerticalTable from "../tools/export";
import type {Curve} from '../redux/storageresults/slice'
export default function ResultTab(){
    //const headers = ["#", "q0", "iv", "1/Da", "PVBt", "VBt", "tBt", "Dm", "Wv", "Ca0", "T", "Dc", "Lc", "phi", "X"];
    const dispatch = useDispatch();
    const handleDelete = () => {
        dispatch(removeCurve(selectedId));
        setSelectedId(ids[0]);
    }
    const {ids, curves} = useSelector((state:RootState)=> state.resultCurves)
    const [selectedId, setSelectedId] = useState(ids.length > 0 ? ids[0] : "");
    const [curve, setCurve] = useState(null)
    const [acid, setAcid] = useState('');
    const [rock, setRock] = useState('');
    const [data, setData] = useState({
        'q0 (cm³/min)':[0],
        'PVBt':[0],
        'iv (m/s)':[0],
        '1/Da':[0],
        'wv (m/s)':[0],
        'vbt (cm³)':[0],
        'tbt (s)':[0],
        'dv':[0]
    })
    const handleCurve = (id: any) => {
        setCurve((curves as any).find((c:Curve)=> c.id === id));
        
        if (!curve) return;
    }

    useEffect(()=>{
        const lastId = ids[ids.length - 1];
        setSelectedId(lastId)
        handleCurve(lastId); 
    },[ids]);

    useEffect(()=>{
        if (!curves.length){
            setData({
                'q0 (cm³/min)':[0],
                'PVBt':[0],
                'iv (m/s)':[0],
                '1/Da':[0],
                'wv (m/s)':[0],
                'vbt (cm³)':[0],
                'tbt (s)':[0],
                'dv':[0]
            });
            setAcid('');
            setRock('');
        }
    },[curves]);

    const getLegen = (key: string)=>{
        switch(key){
            case('q0 (cm³/min)'):
                return 'flowrate (cm³/min)';
            case('PVBt'):
                return 'Pore Volume to Breakthrough (dimensionless)';
            case('iv (m/s)'):
                return 'Intersticial Velocity (m/s)';
            case('1/Da'):
                return 'Damkholer Number Inverse (dimensionless)';
            case('wv (m/s)'):
                return 'Fluid Velocity in the Wormhole (m/s)';
            case('vbt (cm³)'):
                return 'Acid Volume to Breakthrough (cm³)';
            case('tbt (s)'):
                return 'Time to Breakthrough (s)';
            case('dv'):
                return 'Darcy Velocity (m/s)';
            default: 
                return ''

        }
    }

    useEffect(()=>{
        
        if(curve){
            setData({
                'q0 (cm³/min)':(curve as any).flowratePoints,
                'PVBt':(curve as any).pvbtPoints,
                'iv (m/s)':(curve as any).intersticialVelocity,
                '1/Da':(curve as any).iDa,
                'wv (m/s)':(curve as any).wormholeVelocity,
                'vbt (cm³)':(curve as any).volumeToBt,
                'tbt (s)':(curve as any).timeToBt,
                'dv':(curve as any).darcyVelocity
        
            });
            const {acid, rock} = curve as any;
            setAcid(acid);
            setRock(rock);
        }
    },[curve]);

    const headers = Object.keys(data); // 🔥 Obtém os nomes das colunas automaticamente
    const numRows = data? (data as any)[headers[0]].length : null;
    const minPVBtIndex = data["PVBt"].indexOf(Math.min(...data["PVBt"]));
    const minPVBtRow = headers.reduce((obj, key) => {
        (obj as any)[key] = (data as any)[key][minPVBtIndex]; // Associa cada chave ao valor correspondente na linha mínima
        return obj;
      }, {});
    
    return(
        <>
            <div className="w-full max-h-full  rounded-sm p-2">
                <div className="flex justify-around items-center divide-x h-[13vh] py-2 my-3 border-b">
                    <div className="flex flex-col w-1/3 justify-center items-center h-full space-y-4">
                        <select name="" value={selectedId} onChange={(e)=>{handleCurve(e.target.value);setSelectedId(e.target.value)}} id="" className="p-2 bg-white w-4/5 rounded-md shadow-md border-gray-500 border ">
                            {ids.map((id)=>(
                                <option key={id} value={id}>{id}</option>
                            ))}
                        </select>
                        <div className="flex space-x-2 w-4/5">
                            <button className="border p-1 bg-lime-500 rounded-md w-1/2 shadow-md font-bold hover:scale-105 cursor-pointer active:scale-100" onClick={curve?() => exportCurveAsVerticalTable(curve):()=>null}>Export</button>
                            <button className="border p-1 bg-orange-500 rounded-md w-1/2 shadow-md font-bold hover:scale-105 cursor-pointer active:scale-100" onClick={handleDelete}>DELETE</button>
                        </div>
                    </div>
                    <div className="w-1/4 flex flex-col ps-5 justify-center min-h-full text-[0.85vw]">
                        <div className="flex flex-col space-x-1">
                            <p className="font-bold">Acid System:</p>
                            <p className="font-bold text-lime-700">{acid?acid:'...'}</p>
                        </div>
                        <div className="flex flex-col space-x-1">
                            <p className="font-bold">Rock Type:</p>
                            <p className="text-blue-700 font-bold">{rock?rock:'...'}</p>
                        </div>
                    </div>

                    <div className="w-2/5 flex flex-col justify-center ps-5 h-full space-y-2 text-[0.75vw]">
                        <h1 className="text-lg uppercase font-bold">Optimun Parameters</h1>
                        <div className="flex space-x-1">
                            <p className="font-bold">Pore Volume to Breakthrough =</p>
                            <p className="font-bold">{(minPVBtRow as any)['PVBt'].toFixed(4)}</p>
                        </div>

                    </div>
                </div>
                <div className="flex flex-col items-center  overflow-y-auto">
                    <div className="max-h-[15vh] overflow-y-auto w-full">                    
                        <table className="border border-gray-700 text-bla bg-gray-100 shadow-md w-full">
                            <thead>
                            <tr className="bg-gray-300">
                                {headers.map((header, index) => (
                                <th key={index} title={getLegen(header)} className="border cursor-help border-gray-700 px-3 py-2 text-center">
                                    {header}
                                </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {[...Array(numRows)].map((_, rowIndex) => (
                                <tr key={rowIndex} className={`text-center ${(rowIndex === minPVBtIndex) && rowIndex != 0 ? 'bg-green-400 font-bold':''}`}>
                                {headers.map((header, cellIndex) => (
                                    <td key={cellIndex} title={getLegen(header)} className="border cursor-help border-gray-500 px-3 py-2">
                                    {Math.abs((data as any)[header][rowIndex]) < 0.01 && Math.abs((data as any)[header][rowIndex]) > 0 || Math.abs((data as any)[header][rowIndex]) > 1_000 ? (data as any)[header][rowIndex].toExponential(2) :((data as any)[header][rowIndex] != 0) ? (data as any)[header][rowIndex].toFixed(3): (data as any)[header][rowIndex]}
                                    </td>
                                ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>               
                </div>
            </div>
        </>
    )
}