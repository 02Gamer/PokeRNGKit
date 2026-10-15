// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  applySpritePixels,
  spriteGlow,
  filterSpritePixels,
} from "./spritePixels";
import filterFixtures from "./sprite-filter-fixtures.json";
import { createHash } from "node:crypto";
import glowFixtures from "./sprite-glow-fixtures.json";
import hoverGlowFixtures from "./sprite-hover-glow-fixtures.json";
const size = 68 * 56 * 4;
const pixel = (data: Uint8ClampedArray, x: number, y: number) => [
  ...data.slice((y * 68 + x) * 4, (y * 68 + x + 1) * 4),
];
describe("source sprite background pixels", () => {
  it.each(hoverGlowFixtures.cases)(
    "matches unmodified upstream solid hover glow $name",
    (fixture) => {
      const data = new Uint8ClampedArray(size);
      for (const [x, y, r, g, b, a] of fixture.seeds)
        data.set([r, g, b, a], (y * 68 + x) * 4);
      const hash = (value: Uint8ClampedArray) =>
        createHash("sha256").update(value).digest("hex");
      expect(hash(data)).toBe(fixture.inputSha256);
      expect(hash(spriteGlow(data, fixture.color, false))).toBe(
        fixture.outputSha256,
      );
      expect(hash(data)).toBe(fixture.inputSha256);
    },
  );
  it.each(filterFixtures.cases)(
    "matches original bitmap filter $name",
    (fixture) => {
      const data = new Uint8ClampedArray(size);
      for (let y = 0; y < 56; y++)
        for (let x = 0; x < 68; x++)
          data.set(
            [
              (x * 7 + y * 3) & 255,
              (x * 11 + y * 5) & 255,
              (x * 13 + y * 19) & 255,
              (x * 17 + y * 13) & 255,
            ],
            (y * 68 + x) * 4,
          );
      const hash = (value: Uint8ClampedArray) =>
        createHash("sha256").update(value).digest("hex");
      expect(hash(data)).toBe(fixture.inputSha256);
      filterSpritePixels(data, {
        grayscale: fixture.grayscale,
        alpha: fixture.alpha,
      });
      expect(hash(data)).toBe(fixture.outputSha256);
    },
  );
  it("applies encounter color after Tera and writes EXP last", () => {
    const data = new Uint8ClampedArray(size);
    applySpritePixels(
      data,
      { color: "#FF0000", mode: 1, thickness: 2, opacity: 63 },
      { color: "#00FF00", width: 1 },
      { color: "#0000FF", mode: 2, thickness: 4, opacity: 95 },
    );
    expect(pixel(data, 0, 54)).toEqual([0, 0, 255, 95]);
    expect(pixel(data, 0, 55)).toEqual([0, 255, 0, 255]);
    expect(pixel(data, 1, 55)).toEqual([0, 0, 255, 95]);
  });
  it.each(glowFixtures.cases)(
    "matches unmodified upstream hollow glow $name",
    (fixture) => {
      const data = new Uint8ClampedArray(size);
      for (const [x, y, r, g, b, a] of fixture.seeds)
        data.set([r, g, b, a], (y * 68 + x) * 4);
      const hash = (value: Uint8ClampedArray) =>
        createHash("sha256").update(value).digest("hex");
      expect(hash(data)).toBe(fixture.inputSha256);
      expect(hash(spriteGlow(data, fixture.color))).toBe(fixture.outputSha256);
      expect(hash(data)).toBe(fixture.inputSha256);
    },
  );
  it("replaces below-half alpha and preserves all higher alpha for full background", () => {
    const data = new Uint8ClampedArray(size);
    for (const [x, alpha] of [0, 127, 128, 254, 255].entries())
      data.set([10, 20, 30, alpha], x * 4);
    applySpritePixels(data, {
      color: "#AABBCC",
      mode: 2,
      thickness: 4,
      opacity: 63,
    });
    expect(pixel(data, 0, 0)).toEqual([170, 187, 204, 63]);
    expect(pixel(data, 1, 0)).toEqual([170, 187, 204, 63]);
    expect(pixel(data, 2, 0)).toEqual([10, 20, 30, 128]);
    expect(pixel(data, 3, 0)).toEqual([10, 20, 30, 254]);
    expect(pixel(data, 4, 0)).toEqual([10, 20, 30, 255]);
  });
  it("uses source 20/80 byte blending within the selected stripe only", () => {
    const data = new Uint8ClampedArray(size);
    data.set([10, 20, 30, 128], 55 * 68 * 4);
    data.set([10, 20, 30, 255], (55 * 68 + 1) * 4);
    applySpritePixels(data, {
      color: "#AABBCC",
      mode: 1,
      thickness: 1,
      opacity: 175,
    });
    expect(pixel(data, 0, 54)).toEqual([0, 0, 0, 0]);
    expect(pixel(data, 0, 55)).toEqual([138, 153, 169, 165]);
    expect(pixel(data, 1, 55)).toEqual([10, 20, 30, 255]);
    expect(pixel(data, 2, 55)).toEqual([170, 187, 204, 175]);
  });
  it("handles top, zero, negative and excessive thickness using upstream bounds", () => {
    for (const thickness of [-1, 57, 2147483647]) {
      const data = new Uint8ClampedArray(size);
      applySpritePixels(data, {
        color: "#123456",
        mode: 3,
        thickness,
        opacity: 0,
      });
      expect(pixel(data, 67, 55)).toEqual([18, 52, 86, 0]);
    }
    const data = new Uint8ClampedArray(size);
    applySpritePixels(data, {
      color: "#123456",
      mode: 3,
      thickness: 1,
      opacity: 255,
    });
    expect(pixel(data, 0, 0)).toEqual([18, 52, 86, 255]);
    expect(pixel(data, 0, 1)).toEqual([0, 0, 0, 0]);
    const blank = new Uint8ClampedArray(size);
    applySpritePixels(blank, {
      color: "#123456",
      mode: 1,
      thickness: 0,
      opacity: 255,
    });
    expect(blank.every((value) => value === 0)).toBe(true);
  });
  it("writes the experience line last without changing the rest of the canvas", () => {
    const data = new Uint8ClampedArray(size);
    applySpritePixels(
      data,
      { color: "#FF0000", mode: 1, thickness: 2, opacity: 175 },
      { color: "#1E90FF", width: 34 },
    );
    expect(pixel(data, 33, 55)).toEqual([30, 144, 255, 255]);
    expect(pixel(data, 34, 55)).toEqual([255, 0, 0, 175]);
    expect(pixel(data, 0, 54)).toEqual([255, 0, 0, 175]);
    expect(pixel(data, 0, 53)).toEqual([0, 0, 0, 0]);
    applySpritePixels(data, undefined, { color: "#00FF00", width: 68 });
    expect(pixel(data, 67, 55)).toEqual([0, 255, 0, 255]);
  });
  it("rejects malformed data before rendering", () => {
    expect(() => applySpritePixels(new Uint8ClampedArray(4))).toThrow();
    expect(() =>
      applySpritePixels(new Uint8ClampedArray(size), {
        color: "red",
        mode: 2,
        thickness: 1,
        opacity: 255,
      }),
    ).toThrow();
    expect(() =>
      applySpritePixels(new Uint8ClampedArray(size), undefined, {
        color: "#000000",
        width: 69,
      }),
    ).toThrow();
  });
});
