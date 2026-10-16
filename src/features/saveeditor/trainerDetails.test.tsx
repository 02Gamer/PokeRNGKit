// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PokemonTrainerDetailsEditor } from "./PokemonTrainerDetailsEditor";
import {
  trainerDetailsDraft,
  trainerDetailsValues,
  trainerDetailsWords,
  type TrainerDetailsCatalog,
} from "./trainerDetails";
let language: "zh" | "en" | "ja" = "zh";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language } }),
}));
const choice = (id: number) => ({
  id,
  name: { zh: `中${id}`, en: `English${id}`, ja: `日${id}` },
});
const catalog: TrainerDetailsCatalog = {
  language: 2,
  originalGender: 0,
  languages: [choice(1), choice(2), choice(3)],
  maxNameLength: 12,
  handlingName: "OTHER",
  handlingGender: 1,
  handler: 1,
  handlingLanguage: 2,
  handlingLanguages: [choice(0), choice(1), choice(2)],
  originRegion: {
    country: 1,
    region: 1,
    consoleRegion: 1,
    countries: [choice(0), choice(1), choice(2)],
    regions: [
      { country: 0, choices: [choice(0)] },
      { country: 1, choices: [choice(0), choice(1)] },
      { country: 2, choices: [choice(0), choice(2)] },
    ],
    consoles: [choice(0), choice(1)],
  },
  battleVersion: 0,
  battleVersions: [choice(0), choice(44)],
  obedienceLevel: 25,
  suggestedObedienceLevel: 5,
};
it("emits only changed fields and keeps unknown existing values", () => {
  expect(
    trainerDetailsValues(catalog, trainerDetailsDraft(catalog)),
  ).toBeUndefined();
  const anomalous = {
    ...catalog,
    language: 255,
    originalGender: 9,
    handlingGender: 9,
    battleVersion: 255,
    originRegion: { ...catalog.originRegion!, region: 255 },
  };
  const draft = trainerDetailsDraft(anomalous);
  expect(trainerDetailsValues(anomalous, draft)).toBeUndefined();
  expect(
    trainerDetailsValues(anomalous, { ...draft, obedienceLevel: "100" }),
  ).toEqual({ action: "values", obedienceLevel: 100 });
});
it("validates source directories and genders without inventing languages", () => {
  const d = trainerDetailsDraft(catalog);
  for (const changes of [
    { language: "9" },
    { originalGender: "2" },
    { handlingGender: "2" },
    { battleVersion: "99" },
    { handlingLanguage: "255" },
    { country: "255" },
    { consoleRegion: "255" },
  ])
    expect(() => trainerDetailsValues(catalog, { ...d, ...changes })).toThrow();
  expect(
    trainerDetailsValues(catalog, { ...d, language: "1", originalGender: "1" }),
  ).toEqual({ action: "values", language: 1, originalGender: 1 });
});
it("requires subregions of the selected country", () => {
  const d = trainerDetailsDraft(catalog);
  expect(() => trainerDetailsValues(catalog, { ...d, country: "2" })).toThrow();
  expect(
    trainerDetailsValues(catalog, { ...d, country: "2", region: "2" }),
  ).toEqual({ action: "values", country: 2, region: 2 });
});
it("counts source name limits as UTF-16 and rejects null characters", () => {
  const d = trainerDetailsDraft(catalog);
  expect(
    trainerDetailsValues(catalog, { ...d, handlingName: "😀".repeat(6) }),
  ).toEqual({ action: "values", handlingName: "😀".repeat(6) });
  for (const handlingName of ["😀".repeat(7), "a\0b"])
    expect(() =>
      trainerDetailsValues(catalog, { ...d, handlingName }),
    ).toThrow();
});
it("clearing a holder resets only handler and holder gender", () => {
  const d = trainerDetailsDraft(catalog);
  expect(trainerDetailsValues(catalog, { ...d, handlingName: "" })).toEqual({
    action: "values",
    handlingName: "",
    handler: 0,
    handlingGender: 0,
  });
  const empty = { ...catalog, handler: 0, handlingName: "" };
  expect(() =>
    trainerDetailsValues(empty, {
      ...trainerDetailsDraft(empty),
      handler: "1",
    }),
  ).toThrow();
});
it("keeps obedience as a decimal mask so Core performs the byte conversion", () => {
  const d = trainerDetailsDraft(catalog);
  for (const [text, value] of [
    ["", 0],
    ["  ", 0],
    ["100", 100],
    ["255", 255],
    ["256", 256],
    ["999", 999],
  ] as const)
    expect(
      trainerDetailsValues(catalog, { ...d, obedienceLevel: text }),
    ).toEqual({ action: "values", obedienceLevel: value });
  for (const text of ["1000", "-1", "1.5", "0xff", "NaN"])
    expect(() =>
      trainerDetailsValues(catalog, { ...d, obedienceLevel: text }),
    ).toThrow();
});
it("rejects unavailable holder and obedience fields", () => {
  const early = {
    ...catalog,
    handlingName: null,
    handlingGender: null,
    handler: null,
    handlingLanguage: null,
    handlingLanguages: [],
    originRegion: null,
    battleVersion: null,
    battleVersions: [],
    obedienceLevel: null,
    suggestedObedienceLevel: null,
  };
  const d = trainerDetailsDraft(early);
  expect(trainerDetailsValues(early, d)).toBeUndefined();
  for (const change of [
    { handlingName: "X" },
    { handlingGender: "1" },
    { handler: "1" },
    { handlingLanguage: "1" },
    { country: "1" },
    { consoleRegion: "1" },
    { battleVersion: "44" },
    { obedienceLevel: "1" },
  ])
    expect(() => trainerDetailsValues(early, { ...d, ...change })).toThrow();
});
it.each(["zh", "en", "ja"] as const)(
  "uses the common lazy editor in %s",
  (lang) => {
    language = lang;
    const html = renderToStaticMarkup(
      <PokemonTrainerDetailsEditor
        revision={1}
        position={{ box: 0, slot: 0 }}
        disabled={false}
        readDisabled={false}
        onRead={async () => catalog}
        onApply={async () => {}}
      />,
    );
    expect(html).toContain(trainerDetailsWords[lang].title);
    expect(html).toContain(trainerDetailsWords[lang].load);
    expect(html).toContain('class="save-pokemon-editor"');
    expect(html).not.toContain("<fieldset");
  },
);
