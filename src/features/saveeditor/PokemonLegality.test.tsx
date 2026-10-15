// SPDX-License-Identifier: GPL-3.0-or-later
import { renderToStaticMarkup } from "react-dom/server";
import { it, expect, vi } from "vitest";
import { PokemonLegality } from "./PokemonLegality";
import { saveEditorResources } from "./locales";
import type { PokemonLegalityReport } from "./domain";
let language: "zh" | "en" | "ja" = "en";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language },
    t: () => saveEditorResources[language],
  }),
}));
const text = { zh: "详细检查内容", en: "Detailed check", ja: "詳しい検査内容" };
const report: PokemonLegalityReport = {
  box: 0,
  slot: 0,
  parsed: true,
  valid: true,
  summary: text,
  details: text,
  clipboard: text,
  alwaysVerbose: true,
};
it.each(["zh", "en", "ja"] as const)(
  "renders source display policy and copy operation in %s",
  (lang) => {
    language = lang;
    const html = renderToStaticMarkup(
      <PokemonLegality
        position={{ box: 0, slot: 0 }}
        report={report}
        busy={false}
        onAnalyze={async () => {}}
      />,
    );
    expect(html).toContain(saveEditorResources[lang].legalityCopy);
    expect(html).toContain('<details open="">');
    expect(html).toContain(text[lang]);
  },
);
it("suppresses legal report content while preserving the completed status", () => {
  language = "en";
  const html = renderToStaticMarkup(
    <PokemonLegality
      position={{ box: 0, slot: 0 }}
      report={{ ...report, hideReport: true }}
      busy={false}
      onAnalyze={async () => {}}
    />,
  );
  expect(html).toContain(saveEditorResources.en.legalityValid);
  expect(html).not.toContain(text.en);
  expect(html).not.toContain(saveEditorResources.en.legalityCopy);
});
it("hides clipboard operation when disabled and excludes another physical slot", () => {
  language = "en";
  const html = renderToStaticMarkup(
    <PokemonLegality
      position={{ box: 0, slot: 0 }}
      report={{ ...report, canCopy: false }}
      busy={false}
      onAnalyze={async () => {}}
    />,
  );
  expect(html).not.toContain(saveEditorResources.en.legalityCopy);
  const other = renderToStaticMarkup(
    <PokemonLegality
      position={{ box: 0, slot: 1 }}
      report={report}
      busy={false}
      onAnalyze={async () => {}}
    />,
  );
  expect(other).not.toContain(text.en);
});
