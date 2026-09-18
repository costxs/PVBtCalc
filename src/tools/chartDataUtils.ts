import { RadialCurveResult } from "../redux/radial/slice";

export function mergeRadialCurves(curves: RadialCurveResult[]) {
  if (!curves || curves.length === 0) return [];

  const flowrates = curves[0].flowratepoints || [];
  
  const mergedData = flowrates.map((q, index) => {
    const dataPoint: any = { flowrate: q };
    curves.forEach((curve) => {
      const vol = curve.acidvolumepoints?.[index] ?? null;
      dataPoint[curve.target_label] = vol;
    });
    return dataPoint;
  });

  return mergedData;
}

export interface DesignOptimalPoint {
  target: number;
  targetLabel: string;
  optimalFlowrate: number;
  optimalVolume: number;
}

export function getOptimalPointsForDesign(curves: RadialCurveResult[]): DesignOptimalPoint[] {
  const optimalPoints = curves.map(curve => {
    const flowrates = curve.flowratepoints || [];
    const volumes = curve.acidvolumepoints || [];
    
    if (volumes.length === 0) return null;
    
    let minVol = Infinity;
    let optFlowrate = 0;
    
    if (curve.metadata && typeof curve.metadata.q_opt_gal_ft_min === 'number') {
      optFlowrate = curve.metadata.q_opt_gal_ft_min;
      
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < flowrates.length; i++) {
        const diff = Math.abs(flowrates[i] - optFlowrate);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      minVol = volumes[closestIdx] !== null ? (volumes[closestIdx] as number) : Infinity;
      
      if (!isFinite(minVol)) {
        volumes.forEach((vol) => {
          if (vol !== null && vol < minVol) {
            minVol = vol;
          }
        });
      }
    } else {
      volumes.forEach((vol, i) => {
        if (vol !== null && vol < minVol) {
          minVol = vol;
          optFlowrate = flowrates[i];
        }
      });
    }
    
    return {
      target: curve.target,
      targetLabel: curve.target_label,
      optimalFlowrate: optFlowrate,
      optimalVolume: minVol
    };
  }).filter((p): p is DesignOptimalPoint => p !== null && isFinite(p.optimalVolume));

  // Sort by target to ensure the line connects in order
  optimalPoints.sort((a, b) => a.target - b.target);

  return optimalPoints;
}
