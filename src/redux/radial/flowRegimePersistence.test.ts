import { describe, expect, it, beforeEach, vi } from "vitest";

/**
 * flowRegimePersistence.test.ts
 * ------------------------------------------------------------------
 * Bug (2026-09): flowRegime nunca sobrevivia a um reload -- resetava pra
 * "linear" toda vez, mesmo com curvas radiais persistidas em
 * resultCurves (storageresults/slice.tsx, que ESSE sim ja salvava em
 * localStorage). O modulo le/escreve localStorage NO INITIALSTATE e no
 * reducer setFlowRegime; como o vitest deste projeto roda em ambiente
 * "node" puro (sem jsdom), um stub minimo de localStorage precisa existir
 * ANTES do import do slice -- por isso os imports sao dinamicos e
 * `vi.resetModules()` roda entre casos pra forcar o initialState ser
 * recalculado a cada `import()` (ES modules sao cacheados por padrao).
 */

function createMemoryStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  } as Storage;
}

(globalThis as any).localStorage = createMemoryStorage();

beforeEach(() => {
  (globalThis as any).localStorage.clear();
  vi.resetModules();
});

describe("radial slice flowRegime persistence", () => {
  it("defaults to linear when nothing was persisted yet", async () => {
    const { default: reducer } = await import("./slice");
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.flowRegime).toBe("linear");
  });

  it("restores 'radial' from localStorage on load", async () => {
    (globalThis as any).localStorage.setItem("radialFlowRegime", "radial");
    const { default: reducer } = await import("./slice");
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.flowRegime).toBe("radial");
  });

  it("ignores a corrupted/unexpected stored value and falls back to linear", async () => {
    (globalThis as any).localStorage.setItem("radialFlowRegime", "garbage");
    const { default: reducer } = await import("./slice");
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.flowRegime).toBe("linear");
  });

  it("setFlowRegime persists the choice so the NEXT load restores it (the actual bug)", async () => {
    const { default: reducer, setFlowRegime } = await import("./slice");
    let state = reducer(undefined, { type: "@@INIT" });
    state = reducer(state, setFlowRegime("radial"));
    expect(state.flowRegime).toBe("radial");
    expect((globalThis as any).localStorage.getItem("radialFlowRegime")).toBe("radial");

    // simula um reload: novo import, novo initialState calculado do zero
    vi.resetModules();
    const { default: reducerAfterReload } = await import("./slice");
    const reloaded = reducerAfterReload(undefined, { type: "@@INIT" });
    expect(reloaded.flowRegime).toBe("radial");
  });
});
