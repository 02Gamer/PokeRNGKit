import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { parseBattleTemplate, battleTemplateWords } from "./battleTemplate";
import { BattleTemplateViewer } from "./BattleTemplateViewer";
const hash = "A".repeat(64);
const value = {
  apiVersion: 184,
  sourceHash: hash,
  scope: "single",
  box: null,
  slot: null,
  count: 1,
  text: { zh: "皮卡丘\r\n", en: "Pikachu\r\n", ja: "ピカチュウ\r\n" },
};
describe("battle template boundary", () => {
  it("preserves full multilingual text and empty collection results", () => {
    expect(parseBattleTemplate(value, hash, { scope: "single" })).toBe(value);
    expect(
      parseBattleTemplate(
        {
          ...value,
          scope: "allBoxes",
          count: 0,
          text: { zh: "", en: "", ja: "" },
        },
        hash,
        { scope: "allBoxes" },
      ).count,
    ).toBe(0);
  });
  it.each([
    null,
    [],
    { ...value, apiVersion: 165 },
    { ...value, sourceHash: "B".repeat(64) },
    { ...value, box: 0 },
    { ...value, scope: "box" },
    { ...value, count: -1 },
    { ...value, count: 1.5 },
    { ...value, text: { en: "missing languages" } },
    { ...value, text: [] },
  ])("rejects stale or malformed report %#", (v) => {
    expect(() => parseBattleTemplate(v, hash, { scope: "single" })).toThrow();
  });
  it("binds collection scope and physical box", () => {
    const report = { ...value, scope: "box", box: 3 };
    expect(
      parseBattleTemplate(report, hash, { scope: "box", box: 3 }).box,
    ).toBe(3);
    expect(() =>
      parseBattleTemplate(report, hash, { scope: "box", box: 2 }),
    ).toThrow();
  });
  it.each(["zh", "en", "ja"] as const)(
    "renders localized independent-file controls without requesting data in %s",
    (lang) => {
      let reads = 0;
      const html = renderToStaticMarkup(
        createElement(BattleTemplateViewer, {
          lang,
          busy: true,
          onRead: async () => {
            reads++;
            return undefined;
          },
        }),
      );
      expect(reads).toBe(0);
      expect(html).toContain(battleTemplateWords[lang].run);
      expect(html).toContain(battleTemplateWords[lang].note);
      expect(html.match(/disabled=""/g)).toHaveLength(2);
    },
  );
});
