import { describe, expect, it, beforeEach, vi } from "vitest";

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

    vi.resetModules();
    const { default: reducerAfterReload } = await import("./slice");
    const reloaded = reducerAfterReload(undefined, { type: "@@INIT" });
    expect(reloaded.flowRegime).toBe("radial");
  });
});
