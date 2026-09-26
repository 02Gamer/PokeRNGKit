import { describe, expect, it } from "vitest";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { renderToStaticMarkup } from "react-dom/server";
import { PokemonLegality } from "./PokemonLegality";
import { saveEditorResources } from "./locales";
import type { PokemonLegalityReport } from "./domain";

const report: PokemonLegalityReport = {
  box: 0,
  slot: 0,
  parsed: true,
  valid: true,
  summary: { zh: "报告摘要", en: "Report summary", ja: "レポート概要" },
  details: { zh: "报告详情", en: "Report details", ja: "レポート詳細" },
};
async function render(value: PokemonLegalityReport, slot = 0, language = "zh") {
  const i18n = createInstance();
  await i18n.init({
    lng: language,
    resources: Object.fromEntries(
      Object.entries(saveEditorResources).map(([lang, words]) => [
        lang,
        { translation: { saveEditor: words } },
      ]),
    ),
  });
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <PokemonLegality
        position={{ box: 0, slot }}
        report={value}
        busy={false}
        onAnalyze={async () => {}}
      />
    </I18nextProvider>,
  );
}
describe("Pokémon legality report", () => {
  it("does not label incomplete analysis as passed", async () => {
    const html = await render({ ...report, parsed: false });
    expect(html).toContain(saveEditorResources.zh.legalityIncomplete);
    expect(html).not.toContain(saveEditorResources.zh.legalityValid);
  });
  it("hides a result from another selected slot", async () => {
    const html = await render(report, 1);
    expect(html).not.toContain(report.summary.zh);
    expect(html).not.toContain(saveEditorResources.zh.legalityValid);
  });
  it("renders each language's report and distinguishes an invalid result", async () => {
    for (const language of ["zh", "en", "ja"] as const) {
      const html = await render({ ...report, valid: false }, 0, language);
      expect(html).toContain(saveEditorResources[language].legalityInvalid);
      expect(html).toContain(report.details[language]);
      expect(html).not.toContain(saveEditorResources[language].legalityValid);
    }
  });
});
