import type { FlowRegime } from "../redux/radial/slice";

export function curveFlowRegime(curveRegime: FlowRegime | undefined): FlowRegime {
  return curveRegime ?? "linear";
}

export function matchesFlowRegime(curveRegime: FlowRegime | undefined, activeRegime: FlowRegime): boolean {
  return curveFlowRegime(curveRegime) === activeRegime;
}
