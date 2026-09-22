import { describe, expect, it } from "vitest";
import { en } from "./en";
import { pt } from "./pt";
import { makeT, translate, translateIfKey } from "./index";

// Key parity is enforced at compile time (pt is Record<keyof typeof en, string>).
// This covers what the type system cannot see: the {placeholders} inside the text.
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("dictionary", () => {
  it("pt and en use the same placeholders for every key", () => {
    const bad = (Object.keys(en) as (keyof typeof en)[]).filter(
      (k) => placeholders(en[k]).join() !== placeholders(pt[k]).join(),
    );
    expect(bad).toEqual([]);
  });

  it("no empty entries", () => {
    for (const k of Object.keys(en) as (keyof typeof en)[]) {
      expect(en[k].trim(), k).not.toBe("");
      expect(pt[k].trim(), k).not.toBe("");
    }
  });

  it("interpolates and leaves unknown placeholders visible", () => {
    expect(translate("en", "export.downloaded", { name: "a.xlsx" })).toBe("Downloaded (a.xlsx)");
    expect(translate("pt", "export.downloaded", { name: "a.xlsx" })).toBe("Baixado (a.xlsx)");
    expect(translate("en", "export.downloaded", {})).toBe("Downloaded ({name})");
  });

  it("translateIfKey: keys (with optional json params) translate, server text passes through", () => {
    const en = makeT("en"), pt = makeT("pt");
    expect(translateIfKey(en, "error.analysis_failed")).toBe("Analysis failed.");
    expect(translateIfKey(pt, "error.analysis_failed")).toBe("A análise falhou.");
    expect(translateIfKey(pt, "error.request_failed?{\"status\":500}")).toBe("A requisição de análise falhou (HTTP 500)");
    expect(translateIfKey(en, "body: Value is wrong")).toBe("body: Value is wrong");
    expect(translateIfKey(en, "error.request_failed?{oops")).toBe("error.request_failed?{oops");
  });
});
