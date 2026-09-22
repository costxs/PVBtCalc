import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import NumberInput from "../components/NumberInput";
import { editNumberInput, formatDecimal, numberLocale, parseDecimal } from "./parseDecimal";

describe("parseDecimal: comma and dot are both decimal marks", () => {
  it.each([
    ["0,15", 0.15], ["0.15", 0.15], ["24,05", 24.05], ["24.05", 24.05],
    ["-4", -4], ["-4,5", -4.5], ["-4.5", -4.5], [",5", 0.5], [".5", 0.5],
    ["1e-3", 0.001], ["1,5e2", 150], ["10", 10], [" 0,15 ", 0.15], ["7,", 7],
  ])("%s -> %s", (raw, expected) => expect(parseDecimal(raw)).toBe(expected));

  it("does not treat a dot as a thousands mark (physical inputs)", () => {
    expect(parseDecimal("1.000")).toBe(1);
    expect(parseDecimal("1,000")).toBe(1);
  });

  it.each(["", "abc", "1,2,3", "1.2.3", "1.234,5", "1,234.5", "--1", "1 2", "0,15%"])(
    "rejects ambiguous or malformed %j", (raw) => expect(parseDecimal(raw)).toBeNull(),
  );
});

describe("display follows the language, reading does not", () => {
  it("formats with the language's decimal mark", () => {
    expect(formatDecimal(0.15, "en")).toBe("0.15");
    expect(formatDecimal(0.15, "pt")).toBe("0,15");
    expect(formatDecimal("24.05", "pt")).toBe("24,05");
    expect(formatDecimal(null, "pt")).toBe("");
    expect(numberLocale("en")).toBe("en-US");
    expect(numberLocale("pt")).toBe("pt-BR");
  });

  it.each(["en", "pt"] as const)("what %s displays is read back to the same number", (lang) => {
    for (const n of [0.15, 24.05, 297.2, -4, 1e-7, 1234.5678]) {
      expect(parseDecimal(formatDecimal(n, lang))).toBe(n);
    }
  });

  it.each(["en", "pt"] as const)("in %s, typing 0,15 and 0.15 commits the same value", (lang) => {
    void lang; // reading is language-independent by design
    expect(editNumberInput("0,15")).toEqual({ draft: "0,15", value: 0.15, invalid: false });
    expect(editNumberInput("0.15")).toEqual({ draft: "0.15", value: 0.15, invalid: false });
  });

  it("flags unreadable text instead of committing it silently", () => {
    expect(editNumberInput("1,2,3")).toEqual({ draft: "1,2,3", value: null, invalid: true });
    expect(editNumberInput("")).toEqual({ draft: "", value: null, invalid: false });
  });
});

describe("NumberInput renders through the real component", () => {
  const html = (lang: "en" | "pt", value: number) => {
    const store = configureStore({ reducer: { ui: () => ({ language: lang, visibleChart: "A" }) } });
    return renderToStaticMarkup(
      createElement(Provider, { store, children: createElement(NumberInput, { value, onChange: () => {} }) }),
    );
  };
  it("shows the language's decimal mark and is a text box, not type=number", () => {
    expect(html("en", 0.15)).toContain('value="0.15"');
    expect(html("pt", 0.15)).toContain('value="0,15"');
    expect(html("pt", 24.05)).toContain('value="24,05"');
    expect(html("en", 24.05)).not.toContain('type="number"');
    expect(html("en", 24.05)).toContain('inputMode="decimal"');
  });
});
