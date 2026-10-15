import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BattleTemplateImporter } from "./BattleTemplateImporter";
import {
  battleImportWords,
  parseBattleTemplateImport,
  type BattleTemplateTarget,
} from "./battleTemplateImport";
import type { SaveReport } from "./domain";
const target: BattleTemplateTarget = {
  kind: "save",
  box: 0,
  slot: 1,
  fileName: null,
  inputEncrypted: false,
  useFileFormat: false,
};
const text = { zh: "中文", en: "English", ja: "日本語" };
const sourceHash = "A".repeat(64);
const ticket = {
  token: "battle-template:1",
  sourceHash,
  targetHash: "B".repeat(64),
  target,
  before: text,
  result: text,
  parsed: text,
  issues: [],
  changedBytes: 15,
  beforePid: "12345678",
  resultPid: "87654321",
  beforeEncryptionConstant: "12345678",
  resultEncryptionConstant: "ABCDEF01",
};
describe("battle template import boundary", () => {
  it("keeps the complete frozen preview and all localized parser issues", () => {
    const value = { ...ticket, issues: [{ ...text, zh: "原始解析问题\r\n" }] };
    expect(parseBattleTemplateImport(value, sourceHash, target)).toBe(value);
  });
  it.each([
    null,
    [],
    { ...ticket, sourceHash: "C".repeat(64) },
    { ...ticket, targetHash: "bad" },
    { ...ticket, target: { ...target, slot: 2 } },
    { ...ticket, target: null },
    { ...ticket, changedBytes: -1 },
    { ...ticket, changedBytes: 0.5 },
    { ...ticket, issues: ["bad"] },
    { ...ticket, result: { en: "missing" } },
    { ...ticket, resultPid: "0x123456" },
    { ...ticket, token: "other:1" },
  ])("rejects stale sources, targets and incomplete preview %#", (value) => {
    expect(() =>
      parseBattleTemplateImport(value, sourceHash, target),
    ).toThrow();
  });
  it.each(["zh", "en", "ja"] as const)(
    "renders the selected empty target and localized paste/preview controls in %s",
    (lang) => {
      let requests = 0;
      const report = {
        boxCount: 1,
        partyCount: 0,
        boxSlotCount: 30,
        boxOptions: { currentBox: 0 },
        boxes: [{ index: 0, name: "Box 1" }],
        pokemon: [],
      } as unknown as SaveReport;
      const html = renderToStaticMarkup(
        createElement(BattleTemplateImporter, {
          lang,
          busy: false,
          report,
          actions: {
            preview: async () => {
              requests++;
              return undefined;
            },
            apply: async () => false,
            discard: async () => {},
          },
        }),
      );
      expect(requests).toBe(0);
      expect(html).toContain(battleImportWords[lang].note);
      expect(html).toContain(battleImportWords[lang].preview);
      expect(html).toContain("1 · " + battleImportWords[lang].empty);
      expect(html).toContain('maxLength="1048576"');
      expect(html).toContain("haku-select");
      expect(html.match(/disabled=""/g)).toHaveLength(3);
    },
  );
  it("disables duplicate preview/apply controls during an independent file request", () => {
    const html = renderToStaticMarkup(
      createElement(BattleTemplateImporter, {
        lang: "zh",
        busy: true,
        fileTarget: {
          ...target,
          kind: "file",
          box: 0,
          slot: 0,
          fileName: "a.pk3",
        },
        actions: {
          preview: async () => undefined,
          apply: async () => false,
          discard: async () => {},
        },
      }),
    );
    expect(html.match(/disabled=""/g)).toHaveLength(4);
    expect(html).not.toContain("haku-select");
  });
});
