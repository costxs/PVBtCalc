import { describe, expect, it } from "vitest";
import { pointSeverity } from "./pointSeverity";

describe("pointSeverity — regra de combinacao status + withinValidity (Fase 4)", () => {
  it("status ok e dentro da janela => nenhum marcador", () => {
    expect(pointSeverity("ok", true)).toEqual({ level: "none", tooltip: "" });
  });

  it("status ok e FORA da janela => atencao, so a razao da janela", () => {
    expect(pointSeverity("ok", false)).toEqual({
      level: "warn",
      tooltip: "vazão fora da janela validada pelo artigo",
    });
  });

  it("status !== ok e dentro da janela => erro, so a razao do status", () => {
    expect(pointSeverity("clipped", true)).toEqual({
      level: "error",
      tooltip: "resultado inválido (clipped)",
    });
  });

  it("ponto do piso: clipped E fora da janela => erro, tooltip com AS DUAS razoes", () => {
    expect(pointSeverity("clipped", false)).toEqual({
      level: "error",
      tooltip:
        "resultado inválido (clipped) e vazão fora da janela validada pelo artigo",
    });
  });

  it("erro nunca e rebaixado a atencao quando as duas condicoes valem", () => {
    // prioridade: status !== ok vence sempre
    expect(pointSeverity("clipped", false).level).toBe("error");
  });

  it("status undefined (curva linear / cache antigo) => nenhum marcador, mesmo sem within", () => {
    expect(pointSeverity(undefined, undefined)).toEqual({ level: "none", tooltip: "" });
    expect(pointSeverity(undefined, false)).toEqual({ level: "none", tooltip: "" });
  });

  it("within undefined mas status ok => nao marca atencao (so false marca)", () => {
    expect(pointSeverity("ok", undefined)).toEqual({ level: "none", tooltip: "" });
  });
});
