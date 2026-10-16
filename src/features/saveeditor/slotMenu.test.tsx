// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SlotMenuItems } from "./SaveSlotMenu";
import {
  slotMenuActions,
  slotMenuModifiers,
  slotLegalityAlwaysVisible,
  slotMenuKey,
  menuFocusIndex,
  slotMenuWords,
} from "./slotMenu";
import { SaveBoxGrid } from "./SaveBoxGrid";
import { SaveBoxGallery } from "./SaveBoxGallery";
import { SaveBoxViewer } from "./SaveBoxViewer";
import type { SaveReport, PokemonEntry } from "./domain";
const keys = { ctrlKey: false, altKey: false, shiftKey: false, metaKey: false };
const p = {
  box: 0,
  slot: 0,
  species: 25,
  speciesName: { zh: "皮卡丘", en: "Pikachu", ja: "ピカチュウ" },
  nickname: "TEST",
  level: 5,
  valid: true,
  sprite: "b_25",
} as PokemonEntry;
const report = {
  boxCount: 2,
  boxSlotCount: 30,
  partyCount: 1,
  canEdit: true,
  checksumsValid: true,
  boxOptions: { canSwap: true },
  boxes: [],
  pokemon: [p, { ...p, box: -1 }],
} as unknown as SaveReport;
it.each(Array.from({ length: 16 }, (_, mask) => mask))(
  "matches exact-Control visibility, mask %s",
  (mask) => {
    const modifiers = {
      ctrlKey: !!(mask & 1),
      shiftKey: !!(mask & 2),
      altKey: !!(mask & 4),
      metaKey: !!(mask & 8),
    };
    const actions = slotMenuActions(report, p, modifiers, false, false);
    expect(actions.includes("legality")).toBe(mask === 1);
    expect(slotMenuActions(report, p, modifiers, true, false)).toEqual([
      "view",
      "delete",
      "legality",
    ]);
    expect(slotMenuActions(report, p, modifiers, true, true)).toEqual([]);
  },
);
it("keeps view and analysis available on invalid or read-only data", () => {
  const r = { ...report, canEdit: false, pokemon: [{ ...p, valid: false }] };
  expect(slotMenuActions(r, p, keys, true, false)).toEqual([
    "view",
    "legality",
  ]);
  expect(
    slotMenuActions({ ...report, checksumsValid: false }, p, keys, true, false),
  ).toEqual(["view", "legality"]);
  expect(slotMenuActions(report, p, keys, true, false, false)).toEqual([
    "view",
    "delete",
  ]);
});
it("rejects empty, zero-species, stale and out-of-range positions", () => {
  for (const position of [
    { box: 1, slot: 0 },
    { box: 0, slot: 1 },
    { box: -2, slot: 0 },
    { box: -1, slot: 1 },
    { box: 2, slot: 0 },
    { box: 0, slot: -1 },
    { box: 0, slot: 30 },
    { box: 0, slot: 0.5 },
  ])
    expect(slotMenuActions(report, position, keys, true, false)).toEqual([]);
  expect(
    slotMenuActions(
      { ...report, pokemon: [{ ...p, species: 0 }] },
      p,
      keys,
      true,
      false,
    ),
  ).toEqual([]);
  expect(
    slotMenuActions(report, { box: -1, slot: 0 }, keys, true, false),
  ).toEqual(["view", "delete", "legality"]);
});
it("consumes only the source boolean and defaults to hidden", () => {
  expect(slotLegalityAlwaysVisible("")).toBe(false);
  for (const value of [true, false])
    expect(
      slotLegalityAlwaysVisible(
        JSON.stringify({ display: { slotLegalityAlwaysVisible: value } }),
      ),
    ).toBe(value);
  for (const display of [
    {},
    { slotLegalityAlwaysVisible: 1 },
    { slotLegalityAlwaysVisible: "false" },
  ])
    expect(() =>
      slotLegalityAlwaysVisible(JSON.stringify({ display })),
    ).toThrow();
});
it("copies modifier values without retaining the React event", () => {
  const event = { ...keys, ctrlKey: true, target: { huge: "event" } };
  const snapshot = slotMenuModifiers(event);
  event.ctrlKey = false;
  expect(snapshot).toEqual({ ...keys, ctrlKey: true });
  expect(Object.keys(snapshot)).toHaveLength(4);
});
it("supports menu keys, arrow wrap, Home and End", () => {
  expect(slotMenuKey("F10", true)).toBe(true);
  expect(slotMenuKey("F10", false)).toBe(false);
  expect(slotMenuKey("ContextMenu", false)).toBe(true);
  expect(slotMenuKey("Enter", false)).toBe(false);
  expect(menuFocusIndex(2, "ArrowDown", 3)).toBe(0);
  expect(menuFocusIndex(0, "ArrowUp", 3)).toBe(2);
  expect(menuFocusIndex(1, "Home", 3)).toBe(0);
  expect(menuFocusIndex(0, "End", 3)).toBe(2);
  expect(menuFocusIndex(0, "Enter", 3)).toBeUndefined();
  expect(menuFocusIndex(0, "ArrowDown", 0)).toBeUndefined();
});
it.each(["zh", "en", "ja"] as const)(
  "renders localized menu commands in %s",
  (lang) => {
    const html = renderToStaticMarkup(
      <SlotMenuItems
        actions={["view", "delete", "legality"]}
        lang={lang}
        onAction={() => {}}
      />,
    );
    for (const action of ["view", "delete", "legality"] as const)
      expect(html).toContain(slotMenuWords[lang][action]);
    expect(html.match(/role="menuitem"/g) ?? []).toHaveLength(3);
  },
);
it("shares menu triggers across single, all, dual and party grids", () => {
  const common = {
    report,
    selected: p,
    busy: false,
    lang: "zh" as const,
    revision: 1,
    scope: "test",
    onSelect: () => {},
    onDrop: async () => {},
    onSlotMenu: () => true,
  };
  for (const component of [
    <SaveBoxGrid {...common} box={0} />,
    <SaveBoxGrid {...common} box={-1} />,
    <SaveBoxGallery {...common} onSwap={async () => {}} />,
    <SaveBoxViewer
      {...common}
      main={0}
      secondary={1}
      onMain={() => {}}
      onSecondary={() => {}}
      onSwapViews={() => {}}
    />,
  ])
    expect(renderToStaticMarkup(component)).toContain('aria-haspopup="menu"');
});
it("offers prepared Set on empty boxes and party append positions without inventing view/delete actions", () => {
  expect(
    slotMenuActions(
      report,
      { box: 0, slot: 2 },
      keys,
      false,
      false,
      true,
      true,
    ),
  ).toEqual(["set"]);
  expect(
    slotMenuActions(
      report,
      { box: -1, slot: 5 },
      keys,
      false,
      false,
      true,
      true,
    ),
  ).toEqual(["set"]);
  expect(
    slotMenuActions(
      report,
      { box: -1, slot: 6 },
      keys,
      false,
      false,
      true,
      true,
    ),
  ).toEqual([]);
  expect(
    slotMenuActions(
      report,
      { box: 0, slot: 2 },
      keys,
      false,
      false,
      true,
      false,
    ),
  ).toEqual([]);
  expect(
    slotMenuActions(
      {
        ...report,
        pokemonEditing: {
          canEdit: false,
          editor: "standard",
          canRaw: false,
          canImport: false,
          canStorage: false,
        },
      },
      p,
      keys,
      false,
      false,
      true,
      true,
    ),
  ).toEqual(["view"]);
  expect(slotMenuActions(report, p, keys, true, true, true, true)).toEqual([]);
});
