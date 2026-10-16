import { describe, expect, it } from "vitest";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { renderToStaticMarkup } from "react-dom/server";
import { StandaloneGbEditor } from "./StandaloneGbEditor";
import { saveEditorResources } from "./locales";
import type { PokemonEntry } from "./domain";
import { parseEntityTemplateCreated } from "./entityTemplate";

const text = { zh: "皮卡丘", en: "Pikachu", ja: "ピカチュウ" };
describe("Stadium and Ranch shared entry points", () => {
  it.each(["sk2", "rk4"])(
    "accepts the native %s template file without changing source binding",
    (extension) => {
      const hash = "A".repeat(64),
        value = {
          apiVersion: 182,
          sourceHash: hash,
          version: 1,
          directory: "template",
          expectedFileName: `template.${extension}`,
          usedCustom: false,
          fallback: "none",
          fileName: `template.${extension}`,
        };
      expect(parseEntityTemplateCreated(value, hash)).toBe(value);
      expect(() =>
        parseEntityTemplateCreated(
          { ...value, fileName: "template.other" },
          hash,
        ),
      ).toThrow();
    },
  );
  it.each(["zh", "en", "ja"] as const)(
    "keeps rental OT empty and disabled with source field widths in %s",
    async (lang) => {
      const i18n = createInstance();
      await i18n.init({
        lng: lang,
        resources: { [lang]: { translation: {} } },
        initAsync: false,
      });
      const pokemon = {
        species: 25,
        nickname: "PIKACHU",
        ot: "",
        tid: 1,
        level: 20,
        friendship: 70,
        heldItem: 0,
        gbRental: true,
        ivs: [15, 15, 15, 15, 15, 15],
        evs: [0, 0, 0, 0, 0, 0],
        moveIds: [1, 0, 0, 0],
        movePp: [30, 0, 0, 0],
        movePpUps: [0, 0, 0, 0],
        limits: { nickname: 12, trainerName: 12, iv: 15, ev: 65535, move: 251 },
      } as PokemonEntry;
      const report = {
        generation: 2,
        pokemon,
        attributeChoices: {
          species: [{ id: 25, name: text, forms: [] }],
          natures: [],
          items: [text],
        },
        moveChoices: [
          { name: text, maxPp: [0, 0, 0, 0] },
          { name: text, maxPp: [35, 42, 49, 56] },
        ],
      };
      const html = renderToStaticMarkup(
        <I18nextProvider i18n={i18n}>
          <StandaloneGbEditor
            report={report}
            disabled={false}
            onApply={async () => {}}
          />
        </I18nextProvider>,
      );
      expect(html).toContain(saveEditorResources[lang].trainerName);
      expect(html).toMatch(/<input disabled="" maxLength="12" value=""\/>/);
      expect(html).toContain('max="65535"');
      expect(html).toContain('max="15"');
    },
  );
});
