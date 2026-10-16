// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PokemonExpertEditor } from "./PokemonExpertEditor";
import {
  expertDraft,
  expertMask,
  expertValues,
  identityToolsWords,
  trainerIdInput,
  type ExpertCatalog,
  type TrainerIdInfo,
} from "./pokemonIdentityTools";
let language = "zh";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language } }),
}));
const choice = (id: number) => ({
  id,
  name: { zh: `特性${id}`, en: `Ability${id}`, ja: `特性${id}` },
});
const catalog: ExpertCatalog = {
  ability: 9,
  abilityNumber: 1,
  abilities: [choice(0), choice(9), choice(31)],
  extraBytes: [
    { offset: 10, value: 7 },
    { offset: 20, value: 15 },
  ],
};
const ids: TrainerIdInfo = {
  format: "SixDigit",
  tid: "123456",
  sid: "0001",
  tidWidth: 6,
  sidWidth: 4,
  id32: 1123456,
  tid16: 9320,
  sid16: 17,
  tsv: 1,
};
it("preserves unchanged IDs and submits source decimal masks without JS recomputation", () => {
  expect(trainerIdInput(ids, ids.tid, ids.sid)).toBeUndefined();
  for (const [tid, sid] of [
    ["999999", "4294"],
    ["", ""],
    ["1 2", "  "],
  ])
    expect(trainerIdInput(ids, tid, sid)).toEqual({ tid, sid });
  expect(trainerIdInput(undefined, "broken", "broken")).toBeUndefined();
});
it.each([
  ["1000000", "0"],
  ["0", "10000"],
  ["-1", "0"],
  ["1e2", "0"],
  ["０", "0"],
])("rejects ID mask %s/%s", (tid, sid) =>
  expect(() => trainerIdInput(ids, tid, sid)).toThrow(),
);
it("retains original unusual expert fields until explicitly edited", () => {
  expect(expertValues(catalog, expertDraft(catalog))).toBeUndefined();
  const unusual = { ...catalog, ability: 65535, abilityNumber: 255 };
  expect(expertValues(unusual, expertDraft(unusual))).toBeUndefined();
  expect(
    expertValues(unusual, { ...expertDraft(unusual), byteValue: "8" }),
  ).toEqual({ action: "values", offset: 10, byteValue: 8 });
});
it("only sends selected catalog changes and preserves the three-position cap for Core", () => {
  const d = expertDraft(catalog);
  expect(
    expertValues(catalog, {
      ...d,
      ability: "31",
      abilityNumber: "9",
      byteValue: "999",
    }),
  ).toEqual({
    action: "values",
    ability: 31,
    abilityNumber: 9,
    offset: 10,
    byteValue: 999,
  });
  expect(
    expertValues(catalog, { ...d, offset: "20", byteValue: "15" }),
  ).toBeUndefined();
  expect(expertValues(catalog, { ...d, byteValue: "007" })).toBeUndefined();
  for (const change of [
    { offset: "11" },
    { ability: "10" },
    { abilityNumber: "10" },
    { byteValue: "1000" },
    { byteValue: "-1" },
  ])
    expect(() => expertValues(catalog, { ...d, ...change })).toThrow();
  const early = {
    ...catalog,
    abilities: [],
    abilityNumber: null,
    extraBytes: [],
  };
  expect(() =>
    expertValues(early, { ...expertDraft(early), abilityNumber: "1" }),
  ).toThrow();
});
it.each([
  ["", 0],
  ["   ", 0],
  ["1 2", 0],
  [" 9 ", 9],
  ["999", 999],
] as const)("uses source decimal parsing %s", (text, value) =>
  expect(expertMask(text, 3)).toBe(value),
);
it.each(["zh", "en", "ja"] as const)(
  "renders the shared lazy editor in %s",
  (lang) => {
    language = lang;
    const html = renderToStaticMarkup(
      <PokemonExpertEditor
        position={{ box: 0, slot: 0 }}
        revision={1}
        disabled={false}
        readDisabled={false}
        onRead={async () => catalog}
        onApply={async () => {}}
      />,
    );
    expect(html).toContain(identityToolsWords[lang].title);
    expect(html).toContain(identityToolsWords[lang].load);
    expect(html).not.toContain("<fieldset");
  },
);
