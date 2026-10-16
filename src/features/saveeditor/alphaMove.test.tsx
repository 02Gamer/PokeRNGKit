// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  alphaMoveEdit,
  alphaMoveWords,
  isAlphaMoveSelectable,
} from "./alphaMove";
import { PokemonAlphaMoveEditor } from "./PokemonAlphaMoveEditor";
let language: "zh" | "en" | "ja" = "en";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language } }),
}));
const choices = Array.from({ length: 3 }, (_, id) => ({
  name: { zh: `招式${id}`, en: `Move ${id}`, ja: `技${id}` },
  maxPp: [0, 0, 0, 0],
}));
it.each([0, 1, 2])(
  "accepts catalog selection %i without unrelated fields",
  (move) => {
    expect(alphaMoveEdit({ box: -1, slot: 3 }, move, choices)).toEqual({
      box: -1,
      slot: 3,
      action: "alphaMove",
      alphaMove: move,
    });
  },
);
it.each([-1, 3, 65535, 0.5, NaN, Infinity])(
  "rejects invalid or unlisted selection %s",
  (move) => {
    expect(() => alphaMoveEdit({ box: 0, slot: 0 }, move, choices)).toThrow();
  },
);
it("uses Core availability rather than treating every numeric move as selectable", () => {
  const filtered = choices.map((c, id) => ({
    ...c,
    alphaSelectable: id !== 1,
  }));
  expect(isAlphaMoveSelectable(0, filtered)).toBe(true);
  expect(isAlphaMoveSelectable(1, filtered)).toBe(false);
  expect(isAlphaMoveSelectable(2, filtered)).toBe(true);
  expect(() => alphaMoveEdit({ box: 0, slot: 0 }, 1, filtered)).toThrow();
  language = "en";
  const html = renderToStaticMarkup(
    <PokemonAlphaMoveEditor
      position={{ box: 0, slot: 0 }}
      move={1}
      choices={filtered}
      disabled={false}
      onApply={async () => {}}
    />,
  );
  expect(html).toContain("#1");
});
it.each(["zh", "en", "ja"] as const)(
  "uses shared controls and localized field text in %s",
  (lang) => {
    language = lang;
    const html = renderToStaticMarkup(
      <PokemonAlphaMoveEditor
        position={{ box: 0, slot: 0 }}
        move={1}
        choices={choices}
        disabled={false}
        onApply={async () => {}}
      />,
    );
    expect(html).toContain(alphaMoveWords[lang].title);
    expect(html).toContain(alphaMoveWords[lang].note.replaceAll("'", "&#x27;"));
    expect(html).toContain(choices[1].name[lang]);
    expect(html).toContain("haku-select");
  },
);
it("preserves an unlisted original field visibly and disables an unchanged apply", () => {
  language = "zh";
  const html = renderToStaticMarkup(
    <PokemonAlphaMoveEditor
      position={{ box: 0, slot: 0 }}
      move={65535}
      choices={choices}
      disabled={false}
      onApply={async () => {}}
    />,
  );
  expect(html).toContain("#65535");
  expect(html).toContain('disabled=""');
});
