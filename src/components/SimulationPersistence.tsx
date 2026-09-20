import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { groupSimulations } from "../tools/exportSimulations";
import { upsertSnapshot, listSnapshotSummaries, getSnapshot } from "../tools/simulationStoreIO";
import { openSnapshotIntoRedux } from "../tools/simulationRestore";

export default function SimulationPersistence() {
  const dispatch = useDispatch();
  const { curves, ids } = useSelector((state: RootState) => state.resultCurves);
  const radialState = useSelector((state: RootState) => state.radial);

  useEffect(() => {
    if (ids.length === 0) return;
    const groups = groupSimulations(curves);
    for (const g of groups) {
      if (!g.hasData) continue;
      const isActiveRadialRun = g.flowRegime === "radial" && radialState.lastRunSetup?.id === g.simId;
      upsertSnapshot({
        id: g.simId,
        flowRegime: g.flowRegime,
        rock: g.rock,
        acid: g.acid,
        temperature: g.temperature,
        targets: g.targets,
        curves: g.curves,
        designSeries: isActiveRadialRun ? (radialState.designPlotData?.series ?? undefined) : undefined,
        skinSeries: isActiveRadialRun && Object.keys(radialState.skinEvolutionData).length > 0
          ? radialState.skinEvolutionData
          : undefined,
      }).catch((err) => console.warn("[simulation-persistence] falha ao salvar", g.simId, err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curves, ids]);

  useEffect(() => {
    const simId = radialState.lastRunSetup?.id;
    const series = radialState.designPlotData?.series;
    if (!simId || !series || series.length === 0) return;
    upsertSnapshot({ id: simId, flowRegime: "radial", designSeries: series })
      .catch((err) => console.warn("[simulation-persistence] falha ao salvar design plot", err));
  }, [radialState.designPlotData, radialState.lastRunSetup]);

  useEffect(() => {
    const simId = radialState.lastRunSetup?.id;
    if (!simId || Object.keys(radialState.skinEvolutionData).length === 0) return;
    upsertSnapshot({ id: simId, flowRegime: "radial", skinSeries: radialState.skinEvolutionData })
      .catch((err) => console.warn("[simulation-persistence] falha ao salvar skin evolution", err));
  }, [radialState.skinEvolutionData, radialState.lastRunSetup]);

  useEffect(() => {
    if (radialState.curves.length > 0) return;
    (async () => {
      const summaries = await listSnapshotSummaries();
      const latestRadial = summaries.find((s) => s.flowRegime === "radial");
      if (!latestRadial) return;
      const full = await getSnapshot(latestRadial.id);
      if (!full) return;
      openSnapshotIntoRedux(dispatch, full);
    })().catch((err) => console.warn("[simulation-persistence] falha ao restaurar ao abrir o app", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
