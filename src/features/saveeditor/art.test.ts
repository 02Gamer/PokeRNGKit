import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  itemImage,
  typeWideImage,
  pokemonImage,
  pokemonOverlay,
  pokemonArtwork,
} from "./art";
import dimensions from "./sprite-overlay-dimensions.json";
import manifest from "./art-manifest.json";
import hashes from "../../../third_party/pkhex/art-manifest.json";

describe("local inventory artwork", () => {
  it("uses source storage marker offsets and validates marker identity", () => {
    expect(pokemonOverlay("team", "slot")).toMatchObject({
      x: 49,
      y: 0,
      width: 19,
      height: 19,
    });
    expect(pokemonOverlay("locked", "slot")?.x).toBe(54);
    expect(pokemonOverlay("party6", "slot")).toMatchObject({
      x: 52,
      y: 0,
      width: 16,
      height: 16,
    });
    expect(pokemonOverlay("starter", "slot")).toMatchObject({
      x: 0,
      y: 0,
      width: 16,
      height: 16,
    });
    expect(pokemonOverlay("party7", "slot")).toBeUndefined();
  });
  it("places source legality icons at the fixed 16px bottom-left position", () => {
    expect(pokemonOverlay("warn", "legality")).toMatchObject({
      key: "warn",
      x: 0,
      y: 40,
      width: 16,
      height: 16,
    });
    expect(pokemonOverlay("hint", "legality")).toMatchObject({
      key: "hint",
      x: 0,
      y: 40,
      width: 16,
      height: 16,
    });
    expect(pokemonOverlay("valid", "legality")).toBeUndefined();
  });
  it("anchors source fixed-ball images at bottom left and falls back to Poke Ball", () => {
    expect(pokemonOverlay("_ball2", "ball")).toMatchObject({
      key: "_ball2",
      x: 0,
      y: 36,
      width: 20,
      height: 20,
    });
    expect(pokemonOverlay("_ball255", "ball")?.key).toBe("_ball4");
  });
  it("uses centered Gigantamax and clipped Alpha source marker positions", () => {
    expect(pokemonOverlay("dyna", "marker")).toMatchObject({
      key: "dyna",
      x: 24,
      y: 0,
      width: 20,
      height: 20,
      opacity: 1,
    });
    expect(pokemonOverlay("alpha_alt", "marker")).toMatchObject({
      key: "alpha_alt",
      x: 49,
      y: 0,
      width: 20,
      height: 20,
      opacity: 1,
    });
    expect(pokemonOverlay("bitem_17", "marker")).toBeUndefined();
  });
  it("retains original overlay dimensions, hashes and source placement", () => {
    const mapping: Record<string, string> = manifest,
      sources: Record<string, string> = hashes.files;
    const recorded = new Set(Object.values(sources));
    for (const [key, size] of Object.entries(dimensions)) {
      const bytes = readFileSync(
        new URL(
          `../../../public/save-art/26.08.26/${mapping[key]}`,
          import.meta.url,
        ),
      );
      expect({
        width: bytes.readUInt32BE(16),
        height: bytes.readUInt32BE(20),
      }).toEqual(size);
      expect(
        recorded.has(createHash("sha256").update(bytes).digest("hex")),
      ).toBe(true);
    }
    expect(pokemonOverlay("bitem_17", "item")).toMatchObject({
      x: 46,
      y: 31,
      width: 17,
      height: 23,
    });
    expect(pokemonOverlay("aitem_99999", "item")?.key).toBe("bitem_unk");
    expect(pokemonOverlay("rare_icon_alt_2", "shiny")).toMatchObject({
      x: 0,
      y: 0,
      opacity: 0.7,
    });
  });
  it("resolves all sprite modes and preserves the requested mode in form fallback", () => {
    for (const prefix of ["a", "b", "c"]) {
      expect(pokemonImage({ species: 25, sprite: `${prefix}_25s` })).toMatch(
        new RegExp(`/${prefix}_25s\\.png$`),
      );
      expect(
        pokemonImage({ species: 25, sprite: `${prefix}_25_missing` }),
      ).toMatch(new RegExp(`/${prefix}_25\\.png$`));
    }
  });
  it("uses the source secondary mode before dropping a missing form", () => {
    expect(pokemonImage({ species: 103, sprite: "c_103_1" })).toMatch(
      /\/b_103_1\.png$/,
    );
  });
  it("marks an unavailable form and leaves a known or wholly unknown species unchanged", () => {
    expect(
      pokemonArtwork({ species: 493, sprite: "b_493_255" }).unknownOverlay,
    ).toMatch(/\/b_unknown\.png$/);
    expect(
      pokemonArtwork({ species: 25, sprite: "b_25" }).unknownOverlay,
    ).toBeUndefined();
    expect(pokemonArtwork({ species: 65535, sprite: "b_65535" })).toEqual({
      image: expect.stringMatching(/\/b_unknown\.png$/),
    });
  });
  it("ships KChart wide type sprites locally with original source hashes", () => {
    const sources: Record<string, string> = hashes.files;
    const keys = Object.keys(manifest).filter((key) =>
      key.startsWith("type_wide_"),
    );
    expect(keys).toHaveLength(19);
    for (const key of keys) {
      const filename = manifest[key as keyof typeof manifest];
      expect(typeWideImage(Number(key.slice(-2)))).toContain(
        `/save-art/26.08.26/${filename}`,
      );
      const bytes = readFileSync(
        new URL(
          `../../../public/save-art/26.08.26/${filename}`,
          import.meta.url,
        ),
      );
      expect(Object.values(sources)).toContain(
        createHash("sha256").update(bytes).digest("hex"),
      );
    }
    expect(typeWideImage(255)).toBeUndefined();
  });
  it("keeps empty slots empty and uses an explicit unknown image", () => {
    expect(itemImage("")).toBeUndefined();
    expect(itemImage("bitem_65535")).toMatch(/\/bitem_unk\.png$/);
    expect(itemImage("b_1")).toMatch(/\/bitem_unk\.png$/);
    for (const key of ["bitem_17", "bitem_tm", "bitem_tr"])
      expect(itemImage(key)).toContain(`/save-art/26.08.26/${key}.png`);
  });

  it("ships every item mapping as the original PNG with a recorded source hash", () => {
    const items = Object.entries(manifest).filter(([key]) =>
      key.startsWith("bitem_"),
    );
    expect(items.length).toBe(606);
    const sources: Record<string, string> = hashes.files;
    for (const [, filename] of items) {
      const bytes = readFileSync(
        new URL(
          `../../../public/save-art/26.08.26/${filename}`,
          import.meta.url,
        ),
      );
      expect([...bytes.subarray(0, 8)]).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        sources[`PKHeX.Drawing.PokeSprite/Resources/img/Big Items/${filename}`],
      );
    }
  });
});
