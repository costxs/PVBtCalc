import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../redux/store";
import {setParameter} from "../redux/setup/slice";
export default function RockCard() {
    const dispatch = useDispatch()
    const {core_length: cLength, core_diameter: cDiameter, core_porosity: cPorosity, rock_type: rockType} = useSelector((state:RootState)=>state.setup)
    const rockImages: { [key: string]: string } = {
        "Indiana Limestone": "/rockImages/IndianaLimestone.jpg",
        "Desert Pink": "/rockImages/Desert Pink.jpg",
        "Edwards Yellow": "/rockImages/Edwards Yellow.jpg",
        "Edwards White": "/rockImages/Edwards White.jpg",
        "Austin Chalk": "/rockImages/Austin Chalk.jpg",
        "Winterest Limestone": "/rockImages/Winterest Limestone.jpg",
      };
    return (
        <div className="w- h-full bg-slate-400 rounded-sm px-4 py-4 pt-1 flex flex-col items-center">
            <p className="uppercase font-bold text-2xl">Run Setup</p>
            <div className="p-1 rounded-md mb-3 m-4 mt-2 w-full flex flex-col items-center justify-center">
                <img src={rockImages[rockType]} alt="Indiana Limestone" className="rounded-md w-2/3 shadow-lg border-gray-700 border-2"/>
            </div>
            <div className="w-full">
                <form action="" className="space-y-4">
                    <label htmlFor="" className="font-semibold">Rock Type</label>
                    <select name="" id="" className="rounded-sm font-semibold p-2 shadow-sm bg-gray-200 w-full" onChange={(e) => dispatch(setParameter({key:'rock_type',value:e.target.value}))} value={rockType}>
                        {
                            Object.keys(rockImages).map((rock)=>(
                                <option value={rock} key={rock}>{rock}</option>
                            ))}
                    </select>
                    <div className="flex flex-col">
                        <label htmlFor="" className="font-semibold">Core Length</label>
                        <input type="number" value={cLength} onChange={(e)=>dispatch(setParameter({key:'core_length',value:e.target.value}))} className="bg-slate-700 text-white p-2 w-full shadow-md rounded" placeholder="Inch"/>
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="" className="font-semibold">Core Diameter</label>
                        <input type="number" className="bg-slate-700 text-white p-2 w-full shadow-md rounded" value={cDiameter} onChange={(e)=>dispatch(setParameter({key:'core_diameter',value:e.target.value}))} placeholder="Inch"/>
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="" className="font-semibold">Core Porosity</label>
                        <input type="number" className="bg-slate-700 text-white p-2 w-full shadow-md rounded" value={cPorosity} onChange={(e)=>dispatch(setParameter({key:'core_porosity',value:e.target.value}))} placeholder="Fraction"/>
                    </div>
                </form>
            </div>
        </div>
    );
}
