/**
 * simulationRestore.ts
 * ------------------------------------------------------------------
 * Ponto UNICO que sabe como jogar um SimulationSnapshot (IndexedDB) de
 * volta no Redux -- usado tanto no restore automatico de boot
 * (SimulationPersistence.tsx) quanto no "abrir" manual (aba EXPORT). Nao
 * recalcula nada: so redistribui o que ja foi salvo.
 */
import { restoreRadialSnapshot, setFlowRegime } from "../redux/radial/slice";
import { setVisibleChart } from "../redux/ui/slice";
import { addCurve } from "../redux/storageresults/slice";
import { toRawRadialCurve } from "./exportSimulations";
import type { SimulationSnapshot } from "./simulationSnapshot";

export function openSnapshotIntoRedux(dispatch: (action: any) => void, snapshot: SimulationSnapshot): void {
  // Reinjeta as curvas em resultCurves (addCurve faz upsert por id, e
  // idempotente) -- garante que Results.tsx / a secao "desta sessao" da
  // aba EXPORT mostrem a simulacao aberta mesmo se ela tiver sido removida
  // de resultCurves antes (ex.: apagada manualmente, ou uma sessao nova).
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
