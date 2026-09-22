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

describe("ui slice visibleChart initial state", () => {
  it("defaults to 'A' when flowRegime is not set (linear by default)", async () => {
    const { default: reducer } = await import("./slice");
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.visibleChart).toBe("A");
  });

  it("defaults to 'A' when flowRegime is set to 'radial'", async () => {
    (globalThis as any).localStorage.setItem("radialFlowRegime", "radial");
    const { default: reducer } = await import("./slice");
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.visibleChart).toBe("A");
  });

  it("defaults to 'A' when flowRegime is set to 'linear'", async () => {
    (globalThis as any).localStorage.setItem("radialFlowRegime", "linear");
    const { default: reducer } = await import("./slice");
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.visibleChart).toBe("A");
  });
});
