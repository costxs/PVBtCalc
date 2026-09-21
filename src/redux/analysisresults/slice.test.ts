import { describe, it, expect } from "vitest";
import reducer, { fetchAnalitical, fetchRadialOptimumSweep } from "./slice";

const init = reducer(undefined, { type: "@@init" });

describe("analysisresults slice", () => {
  it("corpo de erro do servidor (422) nunca vira grafico vazio com id undefined", () => {
    const s = reducer(init, fetchAnalitical.fulfilled({ detail: [{ loc: ["body", "flowrate"], msg: "bad" }] } as any, "req", undefined));
    expect(s.status).toBe("error");
    expect(s.error).toBeTruthy();
    expect(s.id).toBe("");
  });

  it("rejeicao guarda a mensagem para o painel do grafico", () => {
    const s = reducer(init, fetchAnalitical.rejected(null, "req", undefined, "minimum: must be lower than maximum"));
    expect(s.status).toBe("error");
    expect(s.error).toMatch(/lower than maximum/);
  });

  it("radial: pending limpa o resultado anterior e marca o regime", () => {
    const s = reducer(init, fetchRadialOptimumSweep.pending("req", { sweepParam: "temperature", minimum: 290, maximum: 330, targetIndex: 0 }));
    expect(s.status).toBe("loading");
    expect(s.regime).toBe("radial");
    expect(s.radial).toBeNull();
  });
});
