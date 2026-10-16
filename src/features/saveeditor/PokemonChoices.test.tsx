// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { PokemonEditor } from "./PokemonEditor";
import { StandaloneGbEditor } from "./StandaloneGbEditor";
import { PokemonRelearnEditor } from "./PokemonRelearnEditor";
import { saveEditorResources } from "./locales";
import type { PokemonEntry } from "./domain";

let language: "zh" | "en" | "ja" = "en";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language },
    t: () => saveEditorResources[language],
  }),
}));
// Observe the option contract independently of the shared popup's open state.
vi.mock("./PokemonSelect", () => ({
  PokemonSelect: (props: ComponentProps<"select">) => <select {...props} />,
}));
vi.mock("./useGenderLabel", () => ({
  useGenderLabel: () => (v: number) => String(v),
}));
const text = (name: string) => ({
  zh: name + "ZH",
  en: name + "EN",
  ja: name + "JA",
});
const p = {
  box: 0,
  slot: 0,
  species: 25,
  form: 0,
  gender: 0,
  nickname: "TEST",
  ot: "OWNER",
  tid: 1,
  sid: 2,
  level: 20,
  friendship: 70,
  isNicknamed: true,
  natureId: 0,
  statAlignment: 0,
  canStatAlignment: false,
  abilityIndex: 0,
  abilityChoices: [text("ABILITY")],
  heldItem: 1,
  ivs: [0, 0, 0, 0, 0, 0],
  evs: [0, 0, 0, 0, 0, 0],
  moveIds: [1, 0, 0, 0],
  movePp: [0, 0, 0, 0],
  movePpUps: [0, 0, 0, 0],
  limits: { nickname: 12, trainerName: 12, iv: 31, ev: 252, move: 3 },
} as PokemonEntry;
const attributes = {
  natures: [text("NATURE")],
  items: [
    text("ITEM_NONE"),
    text("ITEM_CURRENT"),
    text("ITEM_HIDDEN"),
    text("ITEM_ALLOWED"),
  ],
  itemSelectable: [true, false, false, true],
  species: [25, 26, 27].map((id, i) => ({
    id,
    name: text(["SPECIES_CURRENT", "SPECIES_HIDDEN", "SPECIES_ALLOWED"][i]),
    selectable: i === 2,
    forms: [
      { name: text("FORM"), genders: [0, 1], abilities: [text("ABILITY")] },
    ],
  })),
};
const moves = [0, 1, 2, 3].map((id) => ({
  name: text(["MOVE_NONE", "MOVE_CURRENT", "MOVE_HIDDEN", "MOVE_ALLOWED"][id]),
  maxPp: [0, 0, 0, 0],
  selectable: id === 0 || id === 3,
  relearnSelectable: id === 0 || id === 3,
}));
const suffix = { zh: "ZH", en: "EN", ja: "JA" };
it.each(["zh", "en", "ja"] as const)(
  "filters standard and GB directories while retaining disabled current values in %s",
  (lang) => {
    language = lang;
    const views = [
      <PokemonEditor
        pokemon={p}
        attributeChoices={attributes}
        moveChoices={moves}
        disabled={false}
        onApply={async () => {}}
      />,
      <StandaloneGbEditor
        report={{
          pokemon: p,
          generation: 2,
          attributeChoices: attributes,
          moveChoices: moves,
        }}
        disabled={false}
        onApply={async () => {}}
      />,
    ];
    for (const view of views) {
      const html = renderToStaticMarkup(view);
      for (const kind of ["SPECIES", "ITEM", "MOVE"]) {
        expect(html).not.toContain(kind + "_HIDDEN" + suffix[lang]);
        expect(html).toContain(kind + "_ALLOWED" + suffix[lang]);
        expect(html).toMatch(
          new RegExp(
            '<option(?=[^>]*disabled="")[^>]*>' +
              kind +
              "_CURRENT" +
              suffix[lang] +
              "</option>",
          ),
        );
      }
    }
  },
);
it.each(["zh", "en", "ja"] as const)(
  "uses the separate relearn directory and preserves its current anomaly in %s",
  (lang) => {
    language = lang;
    const html = renderToStaticMarkup(
      <PokemonRelearnEditor
        moves={[1, 0, 0, 0]}
        choices={moves}
        position={{ box: 0, slot: 0 }}
        disabled={false}
        onApply={async () => {}}
        onSuggest={async () => undefined}
      />,
    );
    expect(html).not.toContain("MOVE_HIDDEN" + suffix[lang]);
    expect(html).toContain("MOVE_ALLOWED" + suffix[lang]);
    expect(html).toMatch(
      new RegExp(
        '<option(?=[^>]*disabled="")[^>]*>MOVE_CURRENT' +
          suffix[lang] +
          "</option>",
      ),
    );
  },
);
