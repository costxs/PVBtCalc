import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import PhysicalLimitNote from "./PhysicalLimitNote";

const text = (isPt: boolean, swept: string) =>
  renderToStaticMarkup(createElement(PhysicalLimitNote, { isPt, swept })).replace(/<[^>]+>/g, "").replace(/&gt;/g, ">");

describe("PhysicalLimitNote nomeia o que foi varrido", () => {
  it("Design Plot: comprimentos alvo (texto original preservado)", () => {
    expect(text(true, "length")).toContain("Alguns comprimentos alvo exigiram volumes otimizados > 1000 gal/ft e foram truncados");
    expect(text(false, "length")).toContain("Some target lengths required optimized volumes > 1000 gal/ft and were clipped");
  });

  it("Optimum Analysis: temperatura, sem falar em comprimentos", () => {
    expect(text(true, "temperature")).toContain("Alguns valores de temperatura exigiram");
    expect(text(false, "temperature")).toContain("Some temperature values required");
    expect(text(true, "temperature")).not.toMatch(/comprimentos/);
    expect(text(false, "temperature")).not.toMatch(/lengths/);
  });

  it("todo parametro oferecido tem um nome proprio", () => {
    for (const p of ["porosity", "acid_concentration", "wellbore_diameter", "payzone_thickness"]) {
      expect(text(true, p)).not.toMatch(/comprimentos|varridos/);
      expect(text(false, p)).not.toMatch(/target lengths|swept values/);
    }
  });
});
