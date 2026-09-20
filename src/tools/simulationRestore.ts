import { restoreRadialSnapshot, setFlowRegime } from "../redux/radial/slice";
import { setVisibleChart } from "../redux/ui/slice";
import { addCurve } from "../redux/storageresults/slice";
import { toRawRadialCurve } from "./exportSimulations";
import type { SimulationSnapshot } from "./simulationSnapshot";

export function openSnapshotIntoRedux(dispatch: (action: any) => void, snapshot: SimulationSnapshot): void {
  for (const c of snapshot.curves) {
    dispatch(addCurve(c));
  }

  if (snapshot.flowRegime === "radial") {
    dispatch(restoreRadialSnapshot({
      simulationId: snapshot.id,
      curves: snapshot.curves.map(toRawRadialCurve),
      designSeries: snapshot.designSeries,
      skinSeries: snapshot.skinSeries,
      rock: snapshot.rock,
      acid: snapshot.acid,
      concentration: snapshot.concentration,
      porosity: snapshot.porosity,
    }));
    dispatch(setVisibleChart("design"));
  } else {
    dispatch(setFlowRegime("linear"));
    dispatch(setVisibleChart("A"));
  }
}
