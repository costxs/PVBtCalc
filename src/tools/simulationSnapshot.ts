import type { Curve } from "../redux/storageresults/slice";
import type { FlowRegime } from "../redux/radial/slice";

export const SCHEMA_VERSION = 1;
export const MAX_SIMULATIONS = 50;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

export interface SimulationSnapshot {
  schemaVersion: number;
  id: string;
  label: string;
  flowRegime: FlowRegime;
  createdAt: number;
  savedAt: number;
  rock: string;
  acid: string;
  porosity: number | null;
  concentration: number | null;
  temperature: number | null;
  targets: string[];
  curves: Curve[];
  designSeries: unknown[] | null;
  skinSeries: Record<string, { x: number; y: number; l_ft: number }[]> | null;
}

export type SimulationSnapshotSummary = Omit<SimulationSnapshot, "curves" | "designSeries" | "skinSeries">;

export type SnapshotPatch = Partial<Omit<SimulationSnapshot, "schemaVersion" | "id" | "createdAt" | "savedAt">> & {
  id: string;
  flowRegime: FlowRegime;
};

export function isCompatibleSchema(record: unknown): record is SimulationSnapshot {
  return !!record && typeof record === "object" && (record as any).schemaVersion === SCHEMA_VERSION;
}

function withoutUndefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as any)[k] = v;
  }
  return out;
}

function emptySnapshot(id: string, flowRegime: FlowRegime, now: number): SimulationSnapshot {
  return {
    schemaVersion: SCHEMA_VERSION, id, label: id, flowRegime,
    createdAt: now, savedAt: now, rock: "", acid: "", porosity: null,
    concentration: null, temperature: null, targets: [], curves: [],
    designSeries: null, skinSeries: null,
  };
}

export function mergeSnapshotPatch(
  existing: SimulationSnapshot | undefined,
  patch: SnapshotPatch,
  now: number,
): SimulationSnapshot {
  const base = existing ?? emptySnapshot(patch.id, patch.flowRegime, now);
  const clean = withoutUndefined(patch);
  return {
    ...base,
    ...clean,
    schemaVersion: SCHEMA_VERSION,
    id: patch.id,
    flowRegime: patch.flowRegime,
    createdAt: base.createdAt,
    savedAt: now,
  };
}

export function estimateSnapshotBytes(record: SimulationSnapshot): number {
  try {
    return JSON.stringify(record).length;
  } catch {
    return 0;
  }
}

export interface EvictionResult {
  keep: SimulationSnapshot[];
  evicted: SimulationSnapshot[];
}

export function enforceSnapshotLimits(
  all: SimulationSnapshot[],
  maxCount: number = MAX_SIMULATIONS,
  maxBytes: number = MAX_TOTAL_BYTES,
): EvictionResult {
  const sorted = [...all].sort((a, b) => b.savedAt - a.savedAt);
  const keep: SimulationSnapshot[] = [];
  const evicted: SimulationSnapshot[] = [];
  let totalBytes = 0;

  for (const rec of sorted) {
    const size = estimateSnapshotBytes(rec);
    const overCount = keep.length >= maxCount;
    const overBytes = keep.length > 0 && totalBytes + size > maxBytes;
    if (overCount || overBytes) {
      evicted.push(rec);
    } else {
      keep.push(rec);
      totalBytes += size;
    }
  }
  return { keep, evicted };
}
