// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PokemonAdvancedStatsEditor,
  PokemonBoostRows,
} from "./PokemonAdvancedStatsEditor";
import {
  advancedStatsDraft,
  advancedStatsValues,
  advancedStatsWords,
  awakeningShortcut,
  boostInput,
  validateAdvancedStatsDraft,
  type AdvancedStatsInfo,
} from "./advancedStats";
let language: "zh" | "en" | "ja" = "en";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language } }),
}));
const name = { zh: "普通", en: "Normal", ja: "ノーマル" };
const info: AdvancedStatsInfo = {
  awakening: { values: [1, 2, 3, 4, 5, 6], maximum: 200, legalMaximum: null },
  ganbaru: {
    values: [10, 9, 8, 7, 0, 1],
    maximum: 10,
    legalMaximum: [7, 8, 9, 10, 10, 7],
  },
  dynamaxLevel: 5,
  gigantamax: false,
  alpha: true,
  noble: false,
  tera: {
    original: 0,
    override: 19,
    effective: 0,
    primary: 0,
    secondary: 4,
    choices: [
      { id: 0, name },
      { id: 19, name: { zh: "---", en: "---", ja: "---" } },
      { id: 99, name: { zh: "星晶", en: "Stellar", ja: "ステラ" } },
    ],
  },
};
it("shows both boost summaries in the same product stat order", () => {
  const html = renderToStaticMarkup(
    <table>
      <tbody>
        <PokemonBoostRows info={info} lang="en" />
      </tbody>
    </table>,
  );
  expect(html).toContain(advancedStatsWords.en.awakening);
  expect(html).toContain(advancedStatsWords.en.ganbaru);
  expect(html).toContain(
    "<td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td>",
  );
});
it("omits an untouched draft and sends only changed supported fields", () => {
  const draft = advancedStatsDraft(info);
  expect(advancedStatsValues(info, draft)).toBeUndefined();
  expect(advancedStatsValues(info, { ...draft, alpha: false })).toEqual({
    action: "values",
    alpha: false,
  });
});
it("normalizes mask input while preserving untouched abnormal originals", () => {
  const invalid = {
    ...info,
    awakening: { ...info.awakening!, values: [255, 2, 3, 4, 5, 6] },
  };
  const draft = advancedStatsDraft(invalid);
  draft.awakening[1] = "999";
  expect(advancedStatsValues(invalid, draft)).toEqual({
    action: "values",
    awakening: [255, 200, 3, 4, 5, 6],
  });
  expect(() => validateAdvancedStatsDraft(invalid, draft)).toThrow();
  draft.awakening[0] = "200";
  expect(() => validateAdvancedStatsDraft(invalid, draft)).not.toThrow();
});
it("allows GV 10 above an IV-derived recommendation and keeps ordinary flags separate", () => {
  const draft = advancedStatsDraft(info);
  draft.ganbaru[5] = "999";
  draft.gigantamax = true;
  expect(advancedStatsValues(info, draft)).toEqual({
    action: "values",
    ganbaru: [10, 9, 8, 7, 0, 10],
    gigantamax: true,
  });
  expect(() => validateAdvancedStatsDraft(info, draft)).not.toThrow();
});
it.each(["", "   ", "0", "1 2", "999"])("handles decimal mask %j", (value) => {
  expect(boostInput(value, 200)).toBe(
    Math.min(200, Number(value.replaceAll(" ", "") || 0)),
  );
});
it.each(["1000", "-1", "1.5", "A", "\t1"])(
  "rejects non-mask input %j",
  (value) => expect(() => boostInput(value, 10)).toThrow(),
);
it("uses source Tera IDs 19 and 99, preserving unknown raw values unless changed", () => {
  const draft = advancedStatsDraft(info);
  draft.teraOriginal = "99";
  draft.teraOverride = "0";
  expect(advancedStatsValues(info, draft)).toEqual({
    action: "values",
    teraOriginal: 99,
    teraOverride: 0,
  });
  draft.teraOriginal = "18";
  expect(() => advancedStatsValues(info, draft)).toThrow();
  const abnormal = { ...info, tera: { ...info.tera!, original: 200 } };
  expect(
    advancedStatsValues(abnormal, advancedStatsDraft(abnormal)),
  ).toBeUndefined();
});
it.each(Array.from({ length: 16 }, (_, mask) => mask))(
  "matches the exact AV action modifiers %i",
  (mask) => {
    expect(
      awakeningShortcut({
        ctrlKey: !!(mask & 1),
        altKey: !!(mask & 2),
        shiftKey: !!(mask & 4),
        metaKey: !!(mask & 8),
      }),
    ).toBe(mask === 1 ? "avSuggested" : mask === 2 ? "avMinimum" : "avRandom");
  },
);
it.each(["zh", "en", "ja"] as const)(
  "renders unified controls and localized bounds in %s",
  (lang) => {
    language = lang;
    const html = renderToStaticMarkup(
      <PokemonAdvancedStatsEditor
        info={info}
        position={{ box: 0, slot: 0 }}
        disabled={false}
        onApply={async () => {}}
      />,
    );
    expect(html).toContain(advancedStatsWords[lang].title);
    expect(html).toContain(advancedStatsWords[lang].awakening);
    expect(html).toContain(advancedStatsWords[lang].ganbaru);
    expect(html).toContain(advancedStatsWords[lang].over);
    expect(html).toContain('maxLength="3"');
    expect(html).toContain("haku-select");
  },
);
it("does not render unsupported groups or normalize raw values during rendering", () => {
  language = "en";
  const partial = {
    ...info,
    awakening: null,
    ganbaru: null,
    dynamaxLevel: 255,
    alpha: null,
    noble: null,
    tera: null,
  };
  const html = renderToStaticMarkup(
    <PokemonAdvancedStatsEditor
      info={partial}
      position={{ box: 0, slot: 0 }}
      disabled={false}
      onApply={async () => {}}
    />,
  );
  expect(html).toContain("#255");
  expect(html).not.toContain(advancedStatsWords.en.awakening);
  expect(html).not.toContain(advancedStatsWords.en.original);
});
