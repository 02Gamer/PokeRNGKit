// SPDX-License-Identifier: GPL-3.0-or-later
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { PokemonMarkingsEditor } from "./PokemonMarkingsEditor";
import { markingColors, nextMarking } from "./drawSettings";
import type { PokemonEntry } from "./domain";
vi.mock("./useSaveSettingsJson", () => ({ useSaveSettingsJson: () => "" }));
it("uses source marking cycles including reserved states", () => {
  expect([0, 1, 2, 3].map((value) => nextMarking(value, true))).toEqual([
    1, 2, 0, 1,
  ]);
  expect([0, 1].map((value) => nextMarking(value, false))).toEqual([1, 0]);
});
it("validates configured colors and source defaults", () => {
  expect(markingColors("")).toEqual({ blue: "#00bfff", pink: "#ff75b3" });
  expect(
    markingColors('{"draw":{"markBlue":"#ABC123","markPink":"#123456"}}'),
  ).toEqual({ blue: "#ABC123", pink: "#123456" });
  expect(() =>
    markingColors('{"draw":{"markBlue":"red","markPink":"#123456"}}'),
  ).toThrow();
});
it.each(["zh", "en", "ja"] as const)(
  "renders source shape order and accessible color state in %s",
  (lang) => {
    const pokemon = {
      box: 0,
      slot: 0,
      markings: {
        values: [0, 1, 2, 0, 1, 2],
        colored: true,
        shapes: ["circle", "triangle", "square", "heart", "star", "diamond"],
      },
    } as PokemonEntry;
    const html = renderToStaticMarkup(
      <PokemonMarkingsEditor
        pokemon={pokemon}
        lang={lang}
        disabled={false}
        onApply={async () => {}}
      />,
    );
    expect(html).toContain("color:#00bfff");
    expect(html).toContain("color:#ff75b3");
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-pressed="true"');
    expect(html.match(/save-marking-symbol/g) || []).toHaveLength(6);
    expect(html).toContain('disabled=""'); // no-op apply/reset
  },
);
it("omits unsupported markings and retains four Gen III controls in native order", () => {
  const render = (pokemon: PokemonEntry) =>
    renderToStaticMarkup(
      <PokemonMarkingsEditor
        pokemon={pokemon}
        lang="zh"
        disabled={true}
        onApply={async () => {}}
      />,
    );
  expect(render({} as PokemonEntry)).toBe("");
  const html = render({
    markings: {
      values: [0, 1, 0, 1],
      colored: false,
      shapes: ["circle", "square", "triangle", "heart"],
    },
  } as PokemonEntry);
  expect(html.match(/save-marking-symbol/g) || []).toHaveLength(4);
  expect(html.indexOf("正方形")).toBeLessThan(html.indexOf("三角形"));
  expect(html).toContain('<fieldset class="save-markings" disabled="">');
});
