// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PokemonDimensionsEditor } from "./PokemonDimensionsEditor";
import { PokemonLegacyDetailsEditor } from "./PokemonLegacyDetailsEditor";
import {
  dimensionsDraft,
  dimensionsValues,
  dimensionScalarDraft,
  sizeControlShortcut,
  dimensionsWords,
  type DimensionsInfo,
} from "./pokemonDimensions";
import {
  legacyDraft,
  legacyValues,
  toggleLeaf,
  legacyWords,
  type LegacyInfo,
} from "./pokemonLegacyDetails";
let language: "zh" | "en" | "ja" = "zh";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language } }),
}));
const size: DimensionsInfo = {
  heightScalar: 120,
  weightScalar: 130,
  scale: 120,
  heightAbsolute: "1.2",
  weightAbsolute: "3.4",
  cp: 4321,
  heightRating: "M",
  weightRating: "M",
  scaleRating: "M",
  scaleIsDetailed: false,
  linkedScale: true,
  canAuto: true,
};
const choice = (id: number) => ({
  id,
  name: { zh: `地形${id}`, en: `Tile${id}`, ja: `地形${id}` },
});
const legacy: LegacyInfo = {
  groundTile: 0,
  groundTiles: [choice(0), choice(2)],
  shinyLeaf: 0xc1,
  walkingMood: -12,
};
it("size drafts preserve original values and only submit changes", () => {
  const d = dimensionsDraft(size);
  expect(dimensionsValues(size, d, false)).toBeUndefined();
  expect(dimensionsValues(size, { ...d, weightScalar: "0" }, false)).toEqual({
    action: "values",
    auto: false,
    weightScalar: 0,
  });
});
it("links PLA height and scale only when a linked input changes", () => {
  const d = dimensionsDraft(size);
  expect(dimensionScalarDraft(size, d, "heightScalar", "255")).toEqual({
    ...d,
    heightScalar: "255",
    scale: "255",
  });
  expect(dimensionScalarDraft(size, d, "scale", "0").heightScalar).toBe("0");
  expect(dimensionScalarDraft(size, d, "weightScalar", "0").scale).toBe("120");
  expect(() =>
    dimensionsValues(size, { ...d, heightScalar: "255" }, false),
  ).toThrow();
  const mismatch = { ...size, scale: 10 };
  expect(
    dimensionsValues(
      mismatch,
      { ...dimensionsDraft(mismatch), weightScalar: "0" },
      false,
    ),
  ).toEqual({ action: "values", auto: false, weightScalar: 0 });
});
it("rejects scalar range and missing-interface writes", () => {
  const d = dimensionsDraft(size);
  for (const value of ["", "-1", "256", "1.5", "1e2"])
    expect(() =>
      dimensionsValues(size, { ...d, weightScalar: value }, false),
    ).toThrow();
  const plain = {
    ...size,
    scale: null,
    heightAbsolute: null,
    weightAbsolute: null,
    cp: null,
    canAuto: false,
    linkedScale: false,
  };
  for (const edit of [
    { scale: "1" },
    { heightAbsolute: "1" },
    { weightAbsolute: "1" },
    { cp: "1" },
  ])
    expect(() =>
      dimensionsValues(plain, { ...dimensionsDraft(plain), ...edit }, false),
    ).toThrow();
});
it("passes float text to Core without replacing unparsable values with zero", () => {
  const d = dimensionsDraft(size);
  for (const text of ["", "NaN", "Infinity", "-1.5", "bad", "1,234.5", "1e50"])
    expect(
      dimensionsValues(size, { ...d, heightAbsolute: text }, false),
    ).toEqual({ action: "values", auto: false, heightAbsolute: text });
  expect(() =>
    dimensionsValues(size, { ...d, heightAbsolute: "x".repeat(32768) }, false),
  ).toThrow();
});
it("keeps CP as the source five-position mask and preserves empty/unparsable masks", () => {
  const d = dimensionsDraft(size);
  for (const text of ["0", "65535", "65536", "99999", " 12 "])
    expect(dimensionsValues(size, { ...d, cp: text }, false)).toEqual({
      action: "values",
      auto: false,
      cp: Number(text.trim()),
    });
  for (const text of ["", "   ", "1 2"])
    expect(dimensionsValues(size, { ...d, cp: text }, false)).toBeUndefined();
  for (const text of ["100000", "-1", "1.2", "abc"])
    expect(() => dimensionsValues(size, { ...d, cp: text }, false)).toThrow();
});
it("uses only the exact Control modifier for source scalar randomization", () => {
  for (let mask = 0; mask < 16; mask++)
    expect(
      sizeControlShortcut({
        ctrlKey: (mask & 1) !== 0,
        altKey: (mask & 2) !== 0,
        shiftKey: (mask & 4) !== 0,
        metaKey: (mask & 8) !== 0,
      }),
    ).toBe(mask === 1);
});
it("leaf toggles clear the crown when any leaf is removed", () => {
  for (let i = 0; i < 5; i++)
    expect(toggleLeaf(63, i, false)).toBe(31 & ~(1 << i));
  expect(toggleLeaf(31, 5, true)).toBe(63);
  expect(toggleLeaf(32, 0, true)).toBe(33);
  expect(() => toggleLeaf(0, 6, true)).toThrow();
});
it("validates ground directory, signed mood and a new crown", () => {
  const d = legacyDraft(legacy);
  expect(legacyValues(legacy, d)).toBeUndefined();
  expect(
    legacyValues(legacy, {
      ...d,
      groundTile: "2",
      walkingMood: "-127",
      leafFlags: 63,
    }),
  ).toEqual({ groundTile: 2, walkingMood: -127, leafFlags: 63 });
  for (const change of [
    { groundTile: "1" },
    { walkingMood: "-128" },
    { walkingMood: "128" },
    { leafFlags: 32 },
    { leafFlags: 64 },
  ])
    expect(() => legacyValues(legacy, { ...d, ...change })).toThrow();
});
it("retains existing crown/mood anomalies until their fields are changed", () => {
  const unusual = { ...legacy, shinyLeaf: 0xe0, walkingMood: -128 };
  const d = legacyDraft(unusual);
  expect(legacyValues(unusual, d)).toBeUndefined();
  expect(legacyValues(unusual, { ...d, leafFlags: 33 })).toEqual({
    leafFlags: 33,
  });
  expect(legacyValues(unusual, { ...d, groundTile: "2" })).toEqual({
    groundTile: 2,
  });
  const removing = { ...legacy, shinyLeaf: 33 };
  expect(() =>
    legacyValues(removing, { ...legacyDraft(removing), leafFlags: 34 }),
  ).toThrow();
});
it("does not invent unavailable legacy controls", () => {
  const absent = {
    groundTile: null,
    groundTiles: [],
    shinyLeaf: null,
    walkingMood: null,
  };
  for (const change of [
    { groundTile: "1" },
    { leafFlags: 1 },
    { walkingMood: "1" },
  ])
    expect(() =>
      legacyValues(absent, { ...legacyDraft(absent), ...change }),
    ).toThrow();
});
it.each(["zh", "en", "ja"] as const)(
  "uses shared size and legacy fields in %s",
  (lang) => {
    language = lang;
    const props = {
      position: { box: 0, slot: 0 },
      disabled: false,
      onApply: async () => {},
    };
    const sizeHtml = renderToStaticMarkup(
      <PokemonDimensionsEditor info={size} {...props} />,
    );
    expect(sizeHtml).toContain(dimensionsWords[lang].title);
    expect(sizeHtml).toContain(dimensionsWords[lang].apply);
    expect(sizeHtml).toContain('max="255"');
    expect(sizeHtml).toContain('maxLength="5"');
    expect(sizeHtml).toContain('class="save-editor-fields"');
    const leafHtml = renderToStaticMarkup(
      <PokemonLegacyDetailsEditor info={legacy} {...props} />,
    );
    expect(leafHtml).toContain(legacyWords[lang].title);
    expect(leafHtml).toContain(legacyWords[lang].crown);
    expect(leafHtml).toContain('min="-127"');
    expect(leafHtml).toContain('class="check"');
  },
);
