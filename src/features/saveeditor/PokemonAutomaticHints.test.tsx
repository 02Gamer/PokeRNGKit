// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PokemonAutomaticHints } from "./PokemonAutomaticHints";
it("does not render automatic status when Core suppresses it", () => {
  expect(
    renderToStaticMarkup(<PokemonAutomaticHints info={null} lang="zh" />),
  ).toBe("");
});
it.each(["zh", "en", "ja"] as const)(
  "shows only invalid slots and keeps unparsed warnings hidden in %s",
  (lang) => {
    const flags = {
      parsed: true,
      valid: false,
      moves: [true, false, true, false],
      relearn: [false, true, true, true],
    };
    const html = renderToStaticMarkup(
      <PokemonAutomaticHints info={flags} lang={lang} />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain("2, 4");
    expect(html).toContain(": 1</p>");
    const incomplete = renderToStaticMarkup(
      <PokemonAutomaticHints info={{ ...flags, parsed: false }} lang={lang} />,
    );
    expect(incomplete).not.toContain("2, 4");
    expect(incomplete).not.toContain(": 1</p>");
  },
);
