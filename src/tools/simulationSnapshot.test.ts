import { describe, expect, it } from "vitest";
import {
  mergeSnapshotPatch, enforceSnapshotLimits, isCompatibleSchema,
  SCHEMA_VERSION, type SimulationSnapshot,
} from "./simulationSnapshot";

function makeSnapshot(overrides: Partial<SimulationSnapshot> = {}): SimulationSnapshot {
  return {
    schemaVersion: SCHEMA_VERSION, id: "SIM1", label: "SIM1", flowRegime: "radial",
    createdAt: 1000, savedAt: 1000, rock: "Indiana Limestone", acid: "HCl",
    porosity: 0.15, concentration: 0.15, temperature: 338.71, targets: ["5.00 ft"],
    curves: [], designSeries: null, skinSeries: null,
    ...overrides,
  };
}

describe("isCompatibleSchema", () => {
  it("accepts a record with the current schema version", () => {
    expect(isCompatibleSchema(makeSnapshot())).toBe(true);
  });

  it("rejects a record from a different/future schema version, without throwing", () => {
    expect(isCompatibleSchema(makeSnapshot({ schemaVersion: 2 }))).toBe(false);
    expect(isCompatibleSchema(makeSnapshot({ schemaVersion: 0 }))).toBe(false);
  });

  it("rejects null/undefined/non-objects", () => {
    expect(isCompatibleSchema(null)).toBe(false);
    expect(isCompatibleSchema(undefined)).toBe(false);
    expect(isCompatibleSchema("SIM1")).toBe(false);
  });
});

describe("mergeSnapshotPatch", () => {
  it("creates a fresh snapshot (label defaults to id, createdAt == savedAt) when nothing existed", () => {
    const merged = mergeSnapshotPatch(undefined, { id: "SIM1", flowRegime: "radial", curves: [] }, 5000);
    expect(merged.label).toBe("SIM1");
    expect(merged.createdAt).toBe(5000);
    expect(merged.savedAt).toBe(5000);
    expect(merged.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("a patch with only curves does NOT wipe out design/skin saved earlier (partial upsert)", () => {
    const existing = makeSnapshot({ designSeries: [{ temperature_k: 338.71 }], skinSeries: { "0.8": [] } });
    const merged = mergeSnapshotPatch(existing, { id: "SIM1", flowRegime: "radial", curves: [{ id: "SIM1 · 5.00 ft" } as any] }, 6000);
    expect(merged.curves).toHaveLength(1);
    expect(merged.designSeries).toEqual([{ temperature_k: 338.71 }]);
    expect(merged.skinSeries).toEqual({ "0.8": [] });
  });

  it("a design-only patch (arriving later, e.g. user visited the Design tab) does not wipe curves already saved", () => {
    const existing = makeSnapshot({ curves: [{ id: "SIM1 · 5.00 ft" } as any] });
    const merged = mergeSnapshotPatch(existing, { id: "SIM1", flowRegime: "radial", designSeries: [{ temperature_k: 297.04 }] }, 6000);
    expect(merged.curves).toHaveLength(1);
    expect(merged.designSeries).toEqual([{ temperature_k: 297.04 }]);
  });

  it("preserves a user-set label and the original createdAt across an automatic re-save", () => {
    const existing = makeSnapshot({ label: "Meu ensaio favorito", createdAt: 1000, savedAt: 1000 });
    const merged = mergeSnapshotPatch(existing, { id: "SIM1", flowRegime: "radial", curves: [] }, 9000);
    expect(merged.label).toBe("Meu ensaio favorito");
    expect(merged.createdAt).toBe(1000);
    expect(merged.savedAt).toBe(9000);
  });

  it("an explicit label in the patch (rename) overrides the stored one", () => {
    const existing = makeSnapshot({ label: "SIM1" });
    const merged = mergeSnapshotPatch(existing, { id: "SIM1", flowRegime: "radial", label: "Renomeada" }, 9000);
    expect(merged.label).toBe("Renomeada");
  });
});

describe("enforceSnapshotLimits", () => {
  it("keeps everything when under both limits", () => {
    const all = [makeSnapshot({ id: "A", savedAt: 1 }), makeSnapshot({ id: "B", savedAt: 2 })];
    const { keep, evicted } = enforceSnapshotLimits(all, 50, 50 * 1024 * 1024);
    expect(keep).toHaveLength(2);
    expect(evicted).toHaveLength(0);
  });

  it("evicts the OLDEST (by savedAt) first when over the count limit", () => {
    const all = [
      makeSnapshot({ id: "oldest", savedAt: 1 }),
      makeSnapshot({ id: "middle", savedAt: 2 }),
      makeSnapshot({ id: "newest", savedAt: 3 }),
    ];
    const { keep, evicted } = enforceSnapshotLimits(all, 2, 50 * 1024 * 1024);
    expect(keep.map((s) => s.id)).toEqual(["newest", "middle"]);
    expect(evicted.map((s) => s.id)).toEqual(["oldest"]);
  });

  it("evicts the oldest first when over the byte-size limit", () => {
    const big = "x".repeat(1000);
    const all = [
      makeSnapshot({ id: "oldest", savedAt: 1, rock: big }),
      makeSnapshot({ id: "newest", savedAt: 2, rock: big }),
    ];
    // limite pequeno: so cabe 1 registro grande
    const { keep, evicted } = enforceSnapshotLimits(all, 50, 1200);
    expect(keep.map((s) => s.id)).toEqual(["newest"]);
    expect(evicted.map((s) => s.id)).toEqual(["oldest"]);
  });

  it("never evicts everything: the single most recent record survives even if it alone exceeds the byte limit", () => {
    const huge = "x".repeat(10_000);
    const all = [makeSnapshot({ id: "only", savedAt: 1, rock: huge })];
    const { keep, evicted } = enforceSnapshotLimits(all, 50, 10);
    expect(keep.map((s) => s.id)).toEqual(["only"]);
    expect(evicted).toHaveLength(0);
  });
});
