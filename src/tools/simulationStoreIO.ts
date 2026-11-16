// Simulações salvas: ficam na conta do usuário, no banco (rotas /me/simulations), até 10.
// O backend junta cada parte nova ao que já está salvo e remove as mais antigas além do
// limite; a resposta diz quais saíram e a tela avisa (SIMULATION_EVICTED_EVENT).
//
// Antes elas ficavam só no navegador (IndexedDB). migrateLocalSnapshots() sobe essas
// cópias antigas para a conta uma vez e limpa o navegador.
import { createStore, values, clear } from "idb-keyval";
import store from "../redux/store";
import { API_BASE } from "../services/api";
import {
  isCompatibleSchema,
  type SimulationSnapshot, type SimulationSnapshotSummary, type SnapshotPatch,
} from "./simulationSnapshot";

export const SIMULATION_EVICTED_EVENT = "pvbtcalc:simulations-evicted";

export interface SimulationsEvictedDetail {
  evictedIds: string[];
  evictedLabels: string[];
}

const pathOf = (id?: string) => (id === undefined ? "" : `/${encodeURIComponent(id)}`);

async function api<T>(method: string, id?: string, body?: unknown): Promise<T | null> {
  const token = store.getState().user.token;
  if (!token) throw new Error("auth.err_session_expired");
  const res = await fetch(`${API_BASE}/me/simulations${pathOf(id)}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.status === 204 ? null : ((await res.json()) as T);
}

// O app pede para salvar a cada mudança das curvas, inclusive simulações que não mudaram.
// Guardamos o último envio de cada parte para não reenviar o mesmo conteúdo.
const lastSent = new Map<string, string>();
const partKey = (patch: SnapshotPatch) => `${patch.id}|${Object.keys(patch).sort().join(",")}`;
const forget = (id?: string) => {
  for (const k of [...lastSent.keys()]) if (id === undefined || k.startsWith(`${id}|`)) lastSent.delete(k);
};

// Uma gravação por vez, na ordem em que foram pedidas.
let queue: Promise<unknown> = Promise.resolve();
const enqueue = <T>(job: () => Promise<T>): Promise<T> => {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
};

export function upsertSnapshot(patch: SnapshotPatch): Promise<void> {
  const key = partKey(patch);
  const json = JSON.stringify(patch);
  if (lastSent.get(key) === json) return Promise.resolve();
  lastSent.set(key, json);
  return enqueue(async () => {
    try {
      const r = await api<{ evicted: { id: string; label: string }[] }>("PUT", patch.id, patch);
      const evicted = r?.evicted ?? [];
      evicted.forEach((e) => forget(e.id));
      if (evicted.length > 0 && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent<SimulationsEvictedDetail>(SIMULATION_EVICTED_EVENT, {
          detail: { evictedIds: evicted.map((e) => e.id), evictedLabels: evicted.map((e) => e.label) },
        }));
      }
    } catch (err) {
      lastSent.delete(key); // tenta de novo na próxima mudança
      throw err;
    }
  });
}

export async function listSnapshotSummaries(): Promise<SimulationSnapshotSummary[]> {
  await queue; // a lista já inclui o que estava sendo gravado
  const r = await api<{ items: unknown[] }>("GET");
  return (r?.items ?? []).filter(isCompatibleSchema) as SimulationSnapshotSummary[];
}

export async function getSnapshot(id: string): Promise<SimulationSnapshot | null> {
  const raw = await api<unknown>("GET", id);
  return isCompatibleSchema(raw) ? raw : null;
}

export function deleteSnapshot(id: string): Promise<void> {
  forget(id);
  return enqueue(async () => { await api("DELETE", id); });
}

export function deleteAllSnapshots(): Promise<void> {
  forget();
  return enqueue(async () => { await api("DELETE"); });
}

export function renameSnapshot(id: string, newLabel: string): Promise<void> {
  return enqueue(async () => { await api("PATCH", id, { label: newLabel }); });
}

/** Sobe para a conta as simulações que estavam só neste navegador (versão antiga) e
 *  limpa o navegador. As mais antigas vão primeiro, para a ordem se manter; o limite
 *  de 10 do backend vale também aqui. */
export async function migrateLocalSnapshots(): Promise<number> {
  let local: SimulationSnapshot[];
  const legacy = createStore("pvbtcalc-simulations", "simulations");
  try {
    local = (await values<unknown>(legacy)).filter(isCompatibleSchema);
  } catch {
    return 0; // IndexedDB indisponível: nada a migrar
  }
  if (local.length === 0) return 0;
  const oldestFirst = [...local].sort((a, b) => a.savedAt - b.savedAt).slice(-10);
  for (const s of oldestFirst) {
    const patch: SnapshotPatch = {
      id: s.id, label: s.label, flowRegime: s.flowRegime, rock: s.rock, acid: s.acid,
      porosity: s.porosity, concentration: s.concentration, temperature: s.temperature,
      targets: s.targets, curves: s.curves, designSeries: s.designSeries, skinSeries: s.skinSeries,
    };
    await upsertSnapshot(patch);
  }
  await clear(legacy);
  return oldestFirst.length;
}
