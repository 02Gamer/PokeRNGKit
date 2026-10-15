// SPDX-License-Identifier: GPL-3.0-or-later
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PokemonSprite } from "./PokemonSprite";
import { defaultSpriteFilter } from "./spritePixels";

describe("shared Pokemon artwork", () => {
  it("preserves storage overlays even when the physical slot is empty", () => {
    const html = renderToStaticMarkup(
      <PokemonSprite
        pokemon={{
          species: 0,
          sprite: "b_0",
          slotMarkers: ["team", "locked", "party6", "starter"],
        }}
        alt=""
        width={68}
        height={56}
      />,
    );
    expect(html.match(/class="save-pokemon-art-slot"/g)).toHaveLength(4);
    expect(html.indexOf("team.png")).toBeLessThan(html.indexOf("locked.png"));
    expect(html.indexOf("locked.png")).toBeLessThan(html.indexOf("party6.png"));
    expect(html.indexOf("party6.png")).toBeLessThan(
      html.indexOf("starter.png"),
    );
    expect(html).toContain("b_0.png");
  });
  it("keeps invalid slot indication separate from filtered appearance", () => {
    const html = renderToStaticMarkup(
      <PokemonSprite
        pokemon={{ species: 25, sprite: "b_25", legalityIndicator: "warn" }}
        filterProfile={defaultSpriteFilter}
        alt="皮卡丘"
      />,
    );
    expect(html).toContain('class="save-pokemon-art-legality"');
    expect(html).toContain('x="0" y="40" width="16" height="16"');
    expect(html).toContain('class="save-pokemon-art-raster"');
    expect(html).not.toContain("filterProfile=");
    expect(html.match(/aria-label="皮卡丘"/g)).toHaveLength(1);
  });
  it("retains encounter ball and both special marker layers after the source star", () => {
    const html = renderToStaticMarkup(
      <PokemonSprite
        pokemon={{
          species: 25,
          sprite: "a_25s",
          eggOverlay: "a_egg",
          eggAsItem: true,
          shinyOverlay: "rare_icon_alt",
          ballOverlay: "_ball2",
          specialEffects: {
            totemGlow: false,
            shadowGlowSource: null,
            shadowEggAsItem: false,
            marker: "dyna",
          },
          additionalMarker: "alpha_alt",
          encounterLayer: {
            color: "#123456",
            mode: 2,
            thickness: 4,
            opacity: 63,
          },
        }}
        alt="相遇预览"
        width={40}
        height={32}
      />,
    );
    expect(html).toContain("_ball2.png");
    expect(html).toContain('x="0" y="36" width="20" height="20"');
    expect(html.indexOf("save-pokemon-art-shiny")).toBeLessThan(
      html.indexOf("save-pokemon-art-ball"),
    );
    expect(html.indexOf("save-pokemon-art-ball")).toBeLessThan(
      html.indexOf("save-pokemon-art-marker"),
    );
    expect(html.indexOf("save-pokemon-art-marker")).toBeLessThan(
      html.indexOf("save-pokemon-art-additional"),
    );
    expect(html).toContain('class="save-pokemon-art-raster"');
    expect(html.match(/aria-label="相遇预览"/g)).toHaveLength(1);
  });
  it("puts special source markers after shiny and preserves one accessible image", () => {
    const html = renderToStaticMarkup(
      <PokemonSprite
        pokemon={{
          species: 25,
          sprite: "b_25",
          shinyOverlay: "rare_icon_alt",
          specialEffects: {
            totemGlow: false,
            shadowGlowSource: null,
            shadowEggAsItem: false,
            marker: "alpha_alt",
          },
        }}
        alt="头目皮卡丘"
      />,
    );
    expect(html).toContain('x="49" y="0" width="20" height="20"');
    expect(html.indexOf("save-pokemon-art-shiny")).toBeLessThan(
      html.indexOf("save-pokemon-art-marker"),
    );
    expect(html.match(/aria-label="头目皮卡丘"/g)).toHaveLength(1);
  });
  it("uses raster for foreground Totem or background Shadow glow", () => {
    for (const specialEffects of [
      {
        totemGlow: true,
        shadowGlowSource: null,
        shadowEggAsItem: false,
        marker: null,
      },
      {
        totemGlow: false,
        shadowGlowSource: "a_249",
        shadowEggAsItem: false,
        marker: null,
      },
    ]) {
      const html = renderToStaticMarkup(
        <PokemonSprite
          pokemon={{ species: 249, sprite: "b_249x", specialEffects }}
          alt=""
        />,
      );
      expect(html).toContain('class="save-pokemon-art-raster"');
      expect(html).toContain("b_249x.png");
    }
  });
  it("keeps source pixel rendering and a readable fallback in one accessible image", () => {
    const html = renderToStaticMarkup(
      <PokemonSprite
        pokemon={{
          species: 493,
          sprite: "b_493_255",
          teraLayer: { color: "#FFFFE0", mode: 1, thickness: 4, opacity: 175 },
          experienceLine: { color: "#00FF00", width: 68 },
        }}
        alt="阿尔宙斯"
        width={40}
        height={32}
      />,
    );
    expect(html).toContain('class="save-pokemon-art-raster"');
    expect(html).toContain('class="save-pokemon-art-unknown"');
    expect(html).toContain('opacity="0.5"');
    expect(html.match(/aria-label="阿尔宙斯"/g)).toHaveLength(1);
    expect(html).toContain('viewBox="0 0 68 56"');
  });
  it("preserves ordinary image semantics and requested size", () => {
    const html = renderToStaticMarkup(
      <PokemonSprite
        pokemon={{ species: 25, sprite: "a_25s" }}
        alt="皮卡丘"
        width={68}
        height={56}
        loading="lazy"
      />,
    );
    expect(html).toContain("a_25s.png");
    expect(html).toContain('alt="皮卡丘"');
    expect(html).toContain('width="68" height="56"');
    expect(html).not.toContain("save-pokemon-art-egg");
  });
  it("keeps egg layers accessible as one image in either presentation", () => {
    for (const eggAsItem of [true, false]) {
      const html = renderToStaticMarkup(
        <PokemonSprite
          pokemon={{
            species: 490,
            sprite: "c_490",
            eggOverlay: "b_490_e",
            eggAsItem,
          }}
          alt="玛纳霏的蛋"
          width={68}
          height={56}
        />,
      );
      expect(html).toContain(`data-egg-item="${eggAsItem}"`);
      expect(html).toContain("c_490.png");
      expect(html).toContain("b_490_e.png");
      expect(html).toContain('viewBox="0 0 68 56"');
      expect(html.match(/aria-label="玛纳霏的蛋"/g)).toHaveLength(1);
      expect(html).toContain(eggAsItem ? 'x="18" y="1"' : 'x="0" y="0"');
    }
  });
  it("composes egg, held item and shiny in source order on one clipped canvas", () => {
    const html = renderToStaticMarkup(
      <PokemonSprite
        pokemon={{
          species: 25,
          sprite: "b_25s",
          eggOverlay: "b_egg",
          eggAsItem: false,
          itemOverlay: "bitem_17",
          shinyOverlay: "rare_icon_alt_2",
        }}
        alt=""
        width={40}
        height={32}
      />,
    );
    expect(html).toContain('opacity="0.33"');
    expect(html).toContain('x="46" y="31" width="17" height="23"');
    expect(html).toContain('opacity="0.7"');
    expect(html).toContain('aria-hidden="true"');
    expect(html.indexOf("save-pokemon-art-egg")).toBeLessThan(
      html.indexOf("save-pokemon-art-item"),
    );
    expect(html.indexOf("save-pokemon-art-item")).toBeLessThan(
      html.indexOf("save-pokemon-art-shiny"),
    );
  });
  it("applies caller layout classes to the full composite and permits CSS sizing", () => {
    const html = renderToStaticMarkup(
      <PokemonSprite
        pokemon={{ species: 25, sprite: "b_25", itemOverlay: "bitem_17" }}
        className="team-member-art"
        alt="皮卡丘"
        title="携带伤药"
      />,
    );
    expect(html).toContain('class="save-pokemon-art team-member-art"');
    expect(html).toContain('title="携带伤药"');
    expect(html).not.toMatch(/style="[^"]*(?:width|height):/);
    expect(html).not.toMatch(/<svg[^>]*class=/);
  });
});
