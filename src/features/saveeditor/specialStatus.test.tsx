// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PokemonSpecialStatusEditor } from "./PokemonSpecialStatusEditor";
import {
  specialStatusDraft,
  specialStatusValues,
  specialStatusWords,
  strainDraft,
  type SpecialStatusInfo,
} from "./specialStatus";
let language: "zh" | "en" | "ja" = "zh";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language } }),
}));
const info: SpecialStatusInfo = {
  virus: {
    strain: 5,
    days: 2,
    infected: true,
    cured: false,
    durations: [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4],
  },
  nSparkle: true,
  pokeStarFame: 99,
};
it("sends only changed fields", () => {
  const d = specialStatusDraft(info);
  expect(specialStatusValues(info, d)).toBeUndefined();
  expect(
    specialStatusValues(info, { ...d, nSparkle: false, pokeStarFame: "255" }),
  ).toEqual({ action: "values", nSparkle: false, pokeStarFame: 255 });
  expect(specialStatusValues(info, { ...d, days: "0" })).toEqual({
    action: "values",
    days: 0,
  });
});
it("uses Core duration metadata for strain changes", () => {
  const d = specialStatusDraft(info);
  expect(strainDraft(info, d, "4")).toEqual({ ...d, strain: "4", days: "1" });
  expect(strainDraft(info, d, "15")).toEqual({ ...d, strain: "15", days: "2" });
  const changed = {
    ...info,
    virus: { ...info.virus!, durations: Array(16).fill(0) },
  };
  expect(strainDraft(changed, d, "4").days).toBe("0");
  for (const value of ["-1", "16", "1.2", "", "NaN"])
    expect(() => strainDraft(info, d, value)).toThrow();
});
it("validates every strain and its supplied duration", () => {
  for (let strain = 0; strain < 16; strain++) {
    const maximum = info.virus!.durations[strain];
    for (let days = 0; days <= maximum; days++)
      expect(() =>
        specialStatusValues(info, {
          ...specialStatusDraft(info),
          strain: String(strain),
          days: String(days),
        }),
      ).not.toThrow();
    expect(() =>
      specialStatusValues(info, {
        ...specialStatusDraft(info),
        strain: String(strain),
        days: String(maximum + 1),
      }),
    ).toThrow();
  }
});
it("allows the source strain-zero day-one combination", () => {
  expect(
    specialStatusValues(info, {
      ...specialStatusDraft(info),
      strain: "0",
      days: "1",
    }),
  ).toEqual({ action: "values", strain: 0, days: 1 });
});
it("keeps unchanged noncanonical virus values during unrelated edits", () => {
  const abnormal = {
    ...info,
    virus: { ...info.virus!, strain: 15, days: 127 },
  };
  const d = specialStatusDraft(abnormal);
  expect(specialStatusValues(abnormal, d)).toBeUndefined();
  expect(specialStatusValues(abnormal, { ...d, pokeStarFame: "0" })).toEqual({
    action: "values",
    pokeStarFame: 0,
  });
  expect(() => specialStatusValues(abnormal, { ...d, strain: "1" })).toThrow();
  expect(strainDraft(abnormal, d, "1").days).toBe("2");
});
it("checks the byte-wide fame field and rejects unavailable flags", () => {
  const d = specialStatusDraft(info);
  for (const value of ["0", "250", "251", "255"])
    expect(specialStatusValues(info, { ...d, pokeStarFame: value })).toEqual({
      action: "values",
      pokeStarFame: Number(value),
    });
  for (const value of ["-1", "256", "1.2", "", "NaN", "0xff"])
    expect(() =>
      specialStatusValues(info, { ...d, pokeStarFame: value }),
    ).toThrow();
  const modern = { ...info, nSparkle: null, pokeStarFame: null };
  expect(() =>
    specialStatusValues(modern, {
      ...specialStatusDraft(modern),
      nSparkle: true,
    }),
  ).toThrow();
  expect(() =>
    specialStatusValues(modern, {
      ...specialStatusDraft(modern),
      pokeStarFame: "1",
    }),
  ).toThrow();
  const noVirus = { ...info, virus: null };
  expect(() =>
    specialStatusValues(noVirus, {
      ...specialStatusDraft(noVirus),
      strain: "1",
    }),
  ).toThrow();
});
function markup(value: SpecialStatusInfo, disabled = false) {
  return renderToStaticMarkup(
    <PokemonSpecialStatusEditor
      info={value}
      position={{ box: 0, slot: 0 }}
      disabled={disabled}
      onApply={async () => {}}
    />,
  );
}
it.each(["zh", "en", "ja"] as const)(
  "shares controls and localized labels in %s",
  (lang) => {
    language = lang;
    const w = specialStatusWords[lang],
      html = markup(info);
    expect(html).toContain(w.title);
    expect(html).toContain(w.virus);
    expect(html).toContain(w.strain);
    expect(html).toContain(w.days);
    expect(html).toContain(w.apply);
    expect(html).toContain(w.pokeStarFame);
    expect(html).toContain('class="save-pokemon-editor"');
    expect(html).toContain('class="save-editor-fields"');
    expect(html).toContain('class="check"');
    expect(html).toContain('max="255"');
  },
);
it("hides virus controls for no history and days for cured history", () => {
  language = "zh";
  const w = specialStatusWords.zh;
  const never = {
    ...info,
    virus: { ...info.virus!, strain: 0, days: 0, infected: false },
  };
  expect(markup(never)).not.toContain(w.strain);
  expect(markup(never)).not.toContain(w.days);
  const cured = { ...info, virus: { ...info.virus!, days: 0, cured: true } };
  expect(markup(cured)).toContain(w.strain);
  expect(markup(cured)).not.toContain(w.days);
});
it("displays an unchanged unusual source duration without discarding it", () => {
  language = "en";
  expect(markup({ ...info, virus: { ...info.virus!, days: 127 } })).toContain(
    "#127",
  );
  expect(markup({ ...info, nSparkle: null, pokeStarFame: null })).not.toContain(
    specialStatusWords.en.pokeStarFame,
  );
});
