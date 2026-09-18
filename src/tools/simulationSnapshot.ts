/**
 * simulationSnapshot.ts
 * ------------------------------------------------------------------
 * Regras PURAS (sem IndexedDB, sem I/O) do cache de simulacoes -- schema,
 * merge de patch parcial (upsert) e decisao de quais registros evictar por
 * limite de espaco. Separado de simulationStoreIO.ts (que so chama
 * idb-keyval em cima dessas funcoes) pra ficar testavel sem precisar de um
 * IndexedDB de verdade (o ambiente de teste deste projeto roda em Node puro,
 * sem jsdom/indexedDB).
 *
 * Guarda EXATAMENTE o que o backend/redux ja tem -- Curve[] camelCase (a
 * MESMA forma que resultCurves/slice.tsx persiste), design_series/skin_series
 * crus. Nenhum valor recalculado aqui. Nunca guarda imagens (pedido
 * explicito).
 */
import type { Curve } from "../redux/storageresults/slice";
import type { FlowRegime } from "../redux/radial/slice";

export const SCHEMA_VERSION = 1;
export const MAX_SIMULATIONS = 50;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // ~50MB, pedido explicito

export interface SimulationSnapshot {
  schemaVersion: number;
  id: string;
  /** Nome exibido na lista -- editavel ("renomear"), comeca == id. Nunca
   * usado pra casar com Curve.id/target_label (esses continuam intocados). */
  label: string;
  flowRegime: FlowRegime;
  createdAt: number;
  savedAt: number;
  rock: string;
  acid: string;
  porosity: number | null;
  concentration: number | null;
  /** Como a curva original guarda (Celsius linear / Kelvin radial) -- sem
   * conversao aqui, mesma convencao do resto do app. */
  temperature: number | null;
  targets: string[];
  curves: Curve[];
  /** So radial. null quando a simulacao ainda nao passou pela aba Design. */
  designSeries: unknown[] | null;
  /** So radial. null quando ainda nao passou pela aba Skin (ou nao tem vazao configurada). */
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

/** Upsert parcial: campos ausentes (undefined) no patch preservam o valor
 * ja salvo (ou o default, se e a primeira vez) -- assim uma curva radial
 * pode ser salva primeiro e o Design/Skin (que chegam depois, so quando o
 * usuario visita aquelas abas) chega em patches SEPARADOS sem apagar o que
 * ja estava la. label/createdAt nunca regridem por um patch automatico. */
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

/** Mantem os N mais recentes (savedAt desc) respeitando MAX_SIMULATIONS e
 * MAX_TOTAL_BYTES; sempre mantem pelo menos 1 registro (o mais recente),
 * mesmo que ele sozinho passe do limite de bytes -- nunca apaga tudo. */
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
