import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import PhysicalLimitNote from "./PhysicalLimitNote";

const text = (lang: "pt" | "en", swept: string) =>
  renderToStaticMarkup(createElement(PhysicalLimitNote, { lang, swept })).replace(/<[^>]+>/g, "").replace(/&gt;/g, ">");

describe("PhysicalLimitNote nomeia o que foi varrido", () => {
  it("Design Plot: comprimentos alvo (texto original preservado)", () => {
    expect(text("pt", "length")).toContain("Alguns comprimentos alvo exigiram volumes otimizados > 1000 gal/ft e foram truncados");
    expect(text("en", "length")).toContain("Some target lengths required optimized volumes > 1000 gal/ft and were clipped");
  });

  it("Optimum Analysis: temperatura, sem falar em comprimentos", () => {
    expect(text("pt", "temperature")).toContain("Alguns valores de temperatura exigiram");
    expect(text("en", "temperature")).toContain("Some temperature values required");
    expect(text("pt", "temperature")).not.toMatch(/comprimentos/);
    expect(text("en", "temperature")).not.toMatch(/lengths/);
  });

  it("todo parametro oferecido tem um nome proprio", () => {
    for (const p of ["porosity", "acid_concentration", "wellbore_diameter", "payzone_thickness"]) {
      expect(text("pt", p)).not.toMatch(/comprimentos|varridos/);
      expect(text("en", p)).not.toMatch(/target lengths|swept values/);
    }
  });
});
