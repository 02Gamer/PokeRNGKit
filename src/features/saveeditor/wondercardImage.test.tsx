// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WondercardImage } from "./WondercardImage";
import type { WondercardEntry } from "./wondercard";

const gift = {
  empty: false,
  used: true,
  isEntity: true,
  species: 25,
  sprite: "b_25",
  heldItem: 1,
  shiny: true,
  egg: false,
} as WondercardEntry;

describe("Wondercard preview images", () => {
  it("uses local assets and exposes shiny state in the active language", () => {
    for (const [lang, label] of [
      ["zh", "异色"],
      ["en", "Shiny"],
      ["ja", "色違い"],
    ] as const) {
      const html = renderToStaticMarkup(
        <WondercardImage entry={gift} lang={lang} />,
      );
      expect(html).toContain("b_25.png");
      expect(html).toContain("bitem_1.png");
      expect(html).toContain(`aria-label="${label}"`);
      expect(html).toContain('data-used="true"');
      expect(html).not.toContain("https://");
    }
  });
  it("does not display stale entity overlays on empty or item cards", () => {
    for (const entry of [
      { ...gift, empty: true, sprite: "b_0" },
      { ...gift, isEntity: false, sprite: "item_1" },
    ]) {
      const html = renderToStaticMarkup(
        <WondercardImage entry={entry} lang="zh" />,
      );
      expect(html).not.toContain("save-wondercard-held");
      expect(html).not.toContain("save-wondercard-shiny");
    }
  });
});
