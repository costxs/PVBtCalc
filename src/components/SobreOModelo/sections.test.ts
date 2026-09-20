import { describe, expect, it } from "vitest";
import { sections as ptSections, subsections as ptSubsections } from "./content.pt";
import { sections as enSections, subsections as enSubsections } from "./content.en";

const EXPECTED_SECTION_IDS = [
  "intro",
  "nomenclature",
  "properties",
  "linear",
  "radial",
  "parameters",
  "validity",
  "quantities",
  "export",
  "references",
];

const EXPECTED_SUBSECTION_IDS = [
  "intro-matrix",
  "intro-model",
  "intro-scope",
  "nomenclature-tables",
  "linear-qopt",
  "radial-skin",
];

describe("SobreOModelo content parity", () => {
  it("PT and EN expose the same section ids, in the same order", () => {
    expect(ptSections.map((s) => s.id)).toEqual(enSections.map((s) => s.id));
    expect(ptSections.map((s) => s.id)).toEqual(EXPECTED_SECTION_IDS);
  });

  it("PT and EN expose the same subsection ids, in the same order", () => {
    expect(ptSubsections.map((s) => s.id)).toEqual(enSubsections.map((s) => s.id));
    expect(ptSubsections.map((s) => s.id)).toEqual(EXPECTED_SUBSECTION_IDS);
  });
});
