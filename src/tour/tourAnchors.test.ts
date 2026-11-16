// Guarda do tour: todo `anchor` citado em tourContent.ts precisa existir como
// data-tour / data-tour-alt em algum componente. Sem isso, um passo some em
// silêncio depois de qualquer refatoração.
import { describe, expect, it } from "vitest";
import { ALL_ANCHORS, TOURS } from "../i18n/tourContent";

const modules = import.meta.glob("../**/*.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const sources = Object.entries(modules)
  .filter(([p]) => !p.includes("/tour/") && !p.endsWith(".test.tsx"))
  .map(([, src]) => src)
  .join("\n");

describe("tour anchors", () => {
  it("every anchor exists in a component", () => {
    const orphan = ALL_ANCHORS.filter(
      (a) => !sources.includes(`"${a}"`) && !sources.includes(`'${a}'`),
    );
    expect(orphan).toEqual([]);
  });

  it("step ids are unique per track and every step has text", () => {
    for (const def of Object.values(TOURS)) {
      const ids = def.steps.map((s) => s.id);
      expect(new Set(ids).size, def.track).toBe(ids.length);
      for (const s of def.steps) {
        expect(s.title.trim(), `${def.track}.${s.id}`).not.toBe("");
        expect(s.body.trim(), `${def.track}.${s.id}`).not.toBe("");
      }
    }
  });
});
