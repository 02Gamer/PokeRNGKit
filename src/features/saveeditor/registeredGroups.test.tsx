import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import i18n from "../../i18n";
import type { PokemonEntry } from "./domain";
import { localizeSaveError, saveEditorResources } from "./locales";
import { RegisteredGroupWorkspace } from "./RegisteredGroupWorkspace";
import {
  groupPosition,
  moveGroup,
  type RegisteredGroupCatalog,
} from "./registeredGroups";

const catalog: RegisteredGroupCatalog = {
  initialGroup: 1,
  groups: [0, 1, 2].map((index) => ({
    index,
    name: `Core Team ${index + 1}`,
    storage: "Box",
    slots: Array.from({ length: 6 }, (_, slot) => ({
      slot,
      pokemon: null,
      legality: null,
    })),
  })),
};

describe("registered team viewing", () => {
  it.each(["zh", "en", "ja"] as const)(
    "shows real sprites, trainer details and exact group legality in %s",
    async (lang) => {
      await i18n.changeLanguage(lang);
      const current = structuredClone(catalog),
        before = JSON.stringify(catalog);
      current.groups[1].slots[2] = {
        slot: 2,
        legality: "invalid",
        pokemon: {
          species: 25,
          sprite: "b_25",
          speciesName: { zh: "皮卡丘", en: "Pikachu", ja: "ピカチュウ" },
          nickname: "PIKA",
          ot: "Original Trainer",
          tid: 123,
          sid: 0,
          level: 5,
          ivs: [1, 2, 3, 4, 5, 6],
          evs: [0, 0, 0, 0, 0, 0],
          moves: [{ zh: "电击", en: "Thunder Shock", ja: "でんきショック" }],
        } as unknown as PokemonEntry,
      };
      const summary = { zh: "CURRENT-zh", en: "CURRENT-en", ja: "CURRENT-ja" };
      const report = {
        box: -2,
        slot: 2,
        parsed: true,
        valid: false,
        summary,
        details: summary,
      };
      const props = {
        catalog: current,
        group: 1,
        slot: 2,
        lang,
        busy: false,
        onGroup: () => {},
        onSlot: () => {},
        onAnalyze: async () => {},
      };
      const html = renderToStaticMarkup(
        <I18nextProvider i18n={i18n}>
          <RegisteredGroupWorkspace
            {...props}
            analysis={{ position: { group: 1, slot: 2 }, report }}
          />
        </I18nextProvider>,
      );
      expect(html.match(/data-group-slot=/g)).toHaveLength(6);
      expect(html).toContain("save-art/26.08.26/");
      expect(html).toContain("Original Trainer");
      expect(html).toContain(summary[lang]);
      const stale = renderToStaticMarkup(
        <I18nextProvider i18n={i18n}>
          <RegisteredGroupWorkspace
            {...props}
            analysis={{ position: { group: 0, slot: 2 }, report }}
          />
        </I18nextProvider>,
      );
      expect(stale).not.toContain(summary[lang]);
      expect(
        localizeSaveError(
          "Invalid registered team position.",
          saveEditorResources[lang],
        ),
      ).toBe(saveEditorResources[lang].registeredGroupError);
      expect(JSON.stringify(catalog)).toBe(before);
    },
  );
  it("validates a separate physical group/member position namespace", () => {
    expect(groupPosition(catalog, 2, 5)).toEqual({ group: 2, slot: 5 });
    for (const [group, slot] of [
      [-1, 0],
      [3, 0],
      [0, 6],
      [0, -1],
      [0.5, 1],
    ])
      expect(() => groupPosition(catalog, group, slot)).toThrow();
  });
  it("preserves source wraparound and Control edge navigation", () => {
    expect(moveGroup(catalog, 0, -1)).toBe(2);
    expect(moveGroup(catalog, 2, 1)).toBe(0);
    expect(moveGroup(catalog, 1, -1, true)).toBe(0);
    expect(moveGroup(catalog, 1, 1, true)).toBe(2);
  });
  it.each(["zh", "en", "ja"] as const)(
    "renders all six actual empty slots with shared selector in %s",
    (lang) => {
      const before = JSON.stringify(catalog);
      const html = renderToStaticMarkup(
        <RegisteredGroupWorkspace
          catalog={catalog}
          group={1}
          slot={4}
          lang={lang}
          busy={true}
          onGroup={() => {}}
          onSlot={() => {}}
          onAnalyze={async () => {}}
        />,
      );
      expect(html.match(/data-group-slot=/g)).toHaveLength(6);
      expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
      expect(html).toContain("haku-select-trigger");
      expect(html).toContain("Core Team 2");
      expect(html).toContain("disabled");
      expect(html).not.toContain("draggable");
      expect(JSON.stringify(catalog)).toBe(before);
    },
  );
});
