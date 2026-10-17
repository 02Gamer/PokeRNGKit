// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PokemonMoveSelect } from "./PokemonMoveSelect";
import { moveCandidates } from "./pokemonMoveCandidates";
import { PokemonLiveHintsContext } from "./pokemonLiveHintsContext";
import { PokemonLiveHintsStatus } from "./PokemonLiveHints";
import { moveHintWords } from "./pokemonHintsPreview";
vi.mock("./PokemonSelect", () => ({
  PokemonSelect: ({
    highlightedValues,
    ...props
  }: ComponentProps<"select"> & {
    highlightedValues?: ReadonlySet<string>;
  }) => (
    <select
      {...props}
      data-highlights={[...(highlightedValues ?? [])].join(",")}
    />
  ),
}));
const text = (zh: string, en: string, ja: string) => ({ zh, en, ja });
const choices = [
  text("无", "None", "なし"),
  text("乙", "Zulu", "あ"),
  text("丙", "Beta", "う"),
  text("甲", "Alpha", "い"),
  text("隐藏", "Hidden", "隠れ"),
].map((name, id) => ({
  name,
  maxPp: [0, 0, 0, 0],
  selectable: id < 2 || id === 3,
}));
const hints = {
  parsed: true,
  valid: false,
  moves: [true, false, true, true],
  relearn: [],
  learnableMoves: [2, 3, 4],
};
it.each(["zh", "en", "ja"] as const)(
  "groups recommendations in %s without hiding editable alternatives or enabling anomalies",
  (lang) => {
    const rows = moveCandidates(choices, "2", lang, hints.learnableMoves);
    expect(rows[0].id).toBe(3);
    expect(rows.map((v) => v.id).sort()).toEqual([0, 1, 2, 3]);
    expect(rows.find((v) => v.id === 2)).toMatchObject({
      learnable: false,
      choice: { selectable: false },
    });
    const html = renderToStaticMarkup(
      <PokemonLiveHintsContext value={{ status: "ready", hints }}>
        <PokemonMoveSelect choices={choices} lang={lang} value="2" />
      </PokemonLiveHintsContext>,
    );
    expect(html).toContain('data-highlights="3"');
    expect(html).toContain(moveHintWords[lang].learnable);
    expect(html).toContain(moveHintWords[lang].other);
    expect(html).toMatch(/<option value="2" disabled=""/);
    expect(html).toMatch(/<option value="1">/);
    expect(html).not.toContain(choices[4].name[lang]);
  },
);
it.each(["off", "pending", "invalid", "failed"] as const)(
  "clears old candidate highlights while %s",
  (status) => {
    const html = renderToStaticMarkup(
      <PokemonLiveHintsContext value={{ status, hints }}>
        <PokemonMoveSelect choices={choices} lang="en" value="1" />
      </PokemonLiveHintsContext>,
    );
    expect(html).toContain('data-highlights=""');
    expect(html).not.toContain("<optgroup");
  },
);
it("sorts by source ordinal text, keeps IDs and PP indices untouched, and preserves all normal alternatives", () => {
  const before = structuredClone(choices);
  expect(moveCandidates(choices, "2", "en").map((v) => v.id)).toEqual([
    3, 2, 0, 1,
  ]);
  expect(choices).toEqual(before);
});
it.each(["zh", "en", "ja"] as const)(
  "distinguishes pending, invalid, failed and current-input analysis in %s",
  (lang) => {
    for (const status of ["pending", "invalid", "failed"] as const) {
      const html = renderToStaticMarkup(
        <PokemonLiveHintsContext value={{ status }}>
          <PokemonLiveHintsStatus lang={lang} />
        </PokemonLiveHintsContext>,
      );
      expect(html).toContain(moveHintWords[lang][status]);
      expect(html).not.toContain("PKHeX");
    }
    const ready = renderToStaticMarkup(
      <PokemonLiveHintsContext value={{ status: "ready", hints }}>
        <PokemonLiveHintsStatus lang={lang} />
      </PokemonLiveHintsContext>,
    );
    expect(ready).toContain("PKHeX");
    expect(ready).not.toContain("Pending inputs are not included");
    expect(
      renderToStaticMarkup(
        <PokemonLiveHintsContext value={{ status: "off" }}>
          <PokemonLiveHintsStatus lang={lang} />
        </PokemonLiveHintsContext>,
      ),
    ).toBe("");
  },
);
