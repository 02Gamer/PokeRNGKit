// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PokemonEditor } from "./PokemonEditor";
import { saveEditorResources } from "./locales";
import type { PokemonEntry } from "./domain";
let language: "zh" | "en" | "ja" = "en";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language },
    t: () => saveEditorResources[language],
  }),
}));
vi.mock("./useGenderLabel", () => ({
  useGenderLabel: () => (value: number) => String(value),
}));
const text = { zh: "测试", en: "Test", ja: "テスト" };
const pokemon = {
  box: 0,
  slot: 0,
  nickname: "TEST",
  species: 25,
  form: 0,
  gender: 0,
  isNicknamed: true,
  natureId: 0,
  statAlignment: 0,
  canStatAlignment: false,
  abilityIndex: 0,
  heldItem: 0,
  ot: "OWNER",
  level: 25,
  friendship: 70,
  tid: 1,
  sid: 2,
  ivs: [31, 31, 31, 31, 31, 31],
  evs: [255, 255, 255, 255, 255, 255],
  moveIds: [0, 0, 0, 0],
  movePp: [0, 0, 0, 0],
  movePpUps: [0, 0, 0, 0],
  abilityChoices: [text],
  limits: { nickname: 12, trainerName: 12, iv: 31, ev: 252, move: 0 },
  egg: false,
} as PokemonEntry;
const attributes = {
  natures: [text],
  items: [text],
  species: [
    {
      id: 25,
      name: text,
      forms: [{ name: text, genders: [0, 1], abilities: [text] }],
    },
  ],
};
it.each(["zh", "en", "ja"] as const)(
  "replaces ordinary EV controls with the AV workflow in %s",
  (lang) => {
    language = lang;
    const p = {
      ...pokemon,
      advancedStats: {
        awakening: {
          values: [0, 0, 0, 0, 0, 0],
          maximum: 200,
          legalMaximum: null,
        },
        ganbaru: null,
        dynamaxLevel: null,
        gigantamax: null,
        alpha: null,
        noble: null,
        tera: null,
      },
    };
    const html = renderToStaticMarkup(
      <PokemonEditor
        pokemon={p}
        attributeChoices={attributes}
        moveChoices={[{ name: text, maxPp: [0, 0, 0, 0] }]}
        disabled={false}
        onApply={async () => {}}
      />,
    );
    expect(html).toContain(
      `<span>${saveEditorResources[lang].hp} · ${saveEditorResources[lang].ivs}</span>`,
    );
    expect(html).not.toContain(`· ${saveEditorResources[lang].evs}`);
  },
);
it.each(["zh", "en", "ja"] as const)(
  "keeps normal EV controls for other formats in %s",
  (lang) => {
    language = lang;
    const html = renderToStaticMarkup(
      <PokemonEditor
        pokemon={pokemon}
        attributeChoices={attributes}
        moveChoices={[{ name: text, maxPp: [0, 0, 0, 0] }]}
        disabled={false}
        onApply={async () => {}}
      />,
    );
    expect(html).toContain(
      `<span>${saveEditorResources[lang].hp} · ${saveEditorResources[lang].evs}</span>`,
    );
  },
);
