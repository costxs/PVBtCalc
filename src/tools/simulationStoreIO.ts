import { createStore, get, set, del, values, clear } from "idb-keyval";
import {
  isCompatibleSchema, mergeSnapshotPatch, enforceSnapshotLimits,
  type SimulationSnapshot, type SimulationSnapshotSummary, type SnapshotPatch,
} from "./simulationSnapshot";

const DB_NAME = "pvbtcalc-simulations";
const STORE_NAME = "simulations";
const store = createStore(DB_NAME, STORE_NAME);

export const SIMULATION_EVICTED_EVENT = "pvbtcalc:simulations-evicted";

export interface SimulationsEvictedDetail {
  evictedIds: string[];
  evictedLabels: string[];
}

async function readAllCompatible(): Promise<SimulationSnapshot[]> {
  const all = await values<SimulationSnapshot>(store);
  return all.filter(isCompatibleSchema);
}

export async function upsertSnapshot(patch: SnapshotPatch): Promise<void> {
  const existingRaw = await get<SimulationSnapshot>(patch.id, store);
  const existing = isCompatibleSchema(existingRaw) ? existingRaw : undefined;
  const merged = mergeSnapshotPatch(existing, patch, Date.now());
  await set(patch.id, merged, store);

  const all = await readAllCompatible();
  const { evicted } = enforceSnapshotLimits(all);
  if (evicted.length > 0) {
    await Promise.all(evicted.map((e) => del(e.id, store)));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent<SimulationsEvictedDetail>(SIMULATION_EVICTED_EVENT, {
        detail: { evictedIds: evicted.map((e) => e.id), evictedLabels: evicted.map((e) => e.label) },
      }));
    }
  }
}

export async function listSnapshotSummaries(): Promise<SimulationSnapshotSummary[]> {
  const all = await readAllCompatible();
  return all
    .sort((a, b) => b.savedAt - a.savedAt)
    .map((s): SimulationSnapshotSummary => ({
      schemaVersion: s.schemaVersion, id: s.id, label: s.label, flowRegime: s.flowRegime,
      createdAt: s.createdAt, savedAt: s.savedAt, rock: s.rock, acid: s.acid,
      porosity: s.porosity, concentration: s.concentration, temperature: s.temperature,
      targets: s.targets,
    }));
}

export async function getSnapshot(id: string): Promise<SimulationSnapshot | null> {
  const raw = await get<SimulationSnapshot>(id, store);
  return isCompatibleSchema(raw) ? raw : null;
}

export async function deleteSnapshot(id: string): Promise<void> {
  await del(id, store);
}

export async function deleteAllSnapshots(): Promise<void> {
  await clear(store);
}

export async function renameSnapshot(id: string, newLabel: string): Promise<void> {
  const existing = await getSnapshot(id);
  if (!existing) return;
  await set(id, { ...existing, label: newLabel }, store);
}
