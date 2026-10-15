import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BOX_SLOT_DRAG_TYPE,
  adjacentBoxEdit,
  boxDropEdit,
  boxSlotNavigation,
  decodeBoxDrag,
  encodeBoxDrag,
} from "./boxGallery";
import { SaveBoxGallery } from "./SaveBoxGallery";
import type { PokemonEntry, SaveReport } from "./domain";
const pokemon = (box: number, slot: number, species = 25): PokemonEntry =>
  ({
    box,
    slot,
    species,
    sprite: "b_25",
    speciesName: { zh: "皮卡丘", en: "Pikachu", ja: "ピカチュウ" },
    nickname: "Partner",
    level: 20,
    valid: true,
    shiny: true,
    egg: false,
  }) as PokemonEntry;
const report = (): SaveReport =>
  ({
    boxCount: 3,
    boxSlotCount: 30,
    partyCount: 0,
    pokemon: [pokemon(0, 0), pokemon(1, 5, 133)],
    boxes: [
      { index: 0, name: "Friends", wallpaper: 0 },
      { index: 1, name: "Breeding", wallpaper: 1 },
      { index: 2, name: "Empty", wallpaper: 2 },
    ],
    generation: 3,
    format: "SAV3E",
    version: "E",
    canEdit: true,
    checksumsValid: true,
    boxOptions: { canSwap: true },
  }) as SaveReport;
const none = { shiftKey: false, altKey: false, ctrlKey: false, metaKey: false };
describe("Box-list gallery", () => {
  it("shows real empty storage flags while preserving every physical slot", () => {
    const r = report();
    r.emptySlotMarkers = [{ box: 2, slot: 3, markers: ["team", "locked"] }];
    const before = structuredClone(r);
    const html = renderToStaticMarkup(
      <SaveBoxGallery
        report={r}
        revision={1}
        scope="scope"
        selected={{ box: 0, slot: 0 }}
        busy={false}
        lang="zh"
        onSelect={() => {}}
        onSwap={async () => {}}
        onDrop={async () => {}}
      />,
    );
    expect(html.match(/data-slot=/g)).toHaveLength(90);
    expect(html).toContain("locked.png");
    expect(html).toContain("team.png");
    expect(r).toEqual(before);
  });
  it("marks matches without removing or renumbering occupied and empty physical slots", () => {
    const r = report(),
      before = structuredClone(r);
    const html = renderToStaticMarkup(
      <SaveBoxGallery
        report={r}
        revision={7}
        scope="scope"
        selected={{ box: 1, slot: 5 }}
        busy={false}
        lang="zh"
        searchMatches={new Set(["1:5"])}
        onSelect={() => {}}
        onSwap={async () => {}}
        onDrop={async () => {}}
      />,
    );
    expect(html.match(/data-slot=/g)).toHaveLength(90);
    expect(html.match(/data-search-match="true"/g)).toHaveLength(1);
    expect(html.match(/data-search-match="false"/g)).toHaveLength(1);
    expect(html).toContain('data-box="2"');
    expect(r).toEqual(before);
  });
  it("swaps adjacent complete boxes with wraparound and without metadata writes", () => {
    expect(adjacentBoxEdit(report(), 0, -1)).toEqual({
      box: 0,
      name: null,
      wallpaper: null,
      swapWith: 2,
    });
    expect(adjacentBoxEdit(report(), 2, 1).swapWith).toBe(0);
    expect(() =>
      adjacentBoxEdit({ ...report(), canEdit: false }, 0, 1),
    ).toThrow();
    expect(() => adjacentBoxEdit({ ...report(), boxCount: 1 }, 0, 1)).toThrow();
  });
  it("uses exact desktop modifier rules and supports explicit copy and overwrite", () => {
    const r = report(),
      source = { box: 0, slot: 0 },
      target = { box: 1, slot: 5 };
    expect(boxDropEdit(r, source, target, "auto", none)?.action).toBe("swap");
    expect(
      boxDropEdit(r, source, { box: 2, slot: 29 }, "auto", none)?.action,
    ).toBe("move");
    expect(
      boxDropEdit(r, source, target, "auto", { ...none, shiftKey: true })
        ?.action,
    ).toBe("copy");
    expect(
      boxDropEdit(r, source, target, "auto", { ...none, altKey: true })?.action,
    ).toBe("overwrite");
    expect(
      boxDropEdit(r, source, target, "auto", {
        ...none,
        shiftKey: true,
        ctrlKey: true,
      })?.action,
    ).toBe("swap");
    expect(
      boxDropEdit(r, source, target, "auto", {
        ...none,
        altKey: true,
        shiftKey: true,
      })?.action,
    ).toBe("swap");
    expect(boxDropEdit(r, source, target, "overwrite", none)?.action).toBe(
      "overwrite",
    );
    expect(boxDropEdit(r, source, source, "auto", none)).toBeUndefined();
    expect(() =>
      boxDropEdit(r, source, { box: 3, slot: 0 }, "auto", none),
    ).toThrow();
  });
  it("rejects foreign, stale, malformed and invalid-source drags", () => {
    const r = report(),
      p = { box: 0, slot: 0 },
      encoded = encodeBoxDrag("scope", 7, p);
    expect(BOX_SLOT_DRAG_TYPE).toContain("pokerngkit");
    expect(decodeBoxDrag(encoded, "scope", 7, r)).toEqual(p);
    expect(() => decodeBoxDrag(encoded, "foreign", 7, r)).toThrow();
    expect(() => decodeBoxDrag(encoded, "scope", 8, r)).toThrow();
    expect(() => decodeBoxDrag("null", "scope", 7, r)).toThrow();
    expect(() => decodeBoxDrag("{", "scope", 7, r)).toThrow();
    r.pokemon[0].valid = false;
    expect(() => decodeBoxDrag(encoded, "scope", 7, r)).toThrow();
  });
  it("keeps keyboard movement in the physical grid", () => {
    expect(boxSlotNavigation(5, "ArrowDown", 30, 6)).toBe(11);
    expect(boxSlotNavigation(5, "ArrowUp", 30, 6)).toBe(5);
    expect(boxSlotNavigation(29, "ArrowRight", 30, 6)).toBe(29);
    expect(boxSlotNavigation(4, "Home", 30, 6)).toBe(0);
    expect(boxSlotNavigation(4, "End", 30, 6)).toBe(29);
  });
  it("renders every real box and empty slot with local artwork and accessible selection", () => {
    const r = report(),
      before = JSON.stringify(r);
    const markup = renderToStaticMarkup(
      <SaveBoxGallery
        report={r}
        revision={7}
        scope="scope"
        selected={{ box: 0, slot: 0 }}
        busy={false}
        lang="en"
        onSelect={() => undefined}
        onSwap={async () => undefined}
        onDrop={async () => undefined}
      />,
    );
    expect((markup.match(/data-slot=/g) ?? []).length).toBe(90);
    expect(markup).toContain('aria-label="Empty"');
    expect(markup).toContain('data-box="2"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("save-art/26.08.26/");
    expect(markup).toContain('loading="lazy"');
    expect(markup).toContain("Swap previous");
    expect(JSON.stringify(r)).toBe(before);
  });
  it.each(["zh", "en", "ja"] as const)(
    "uses independent slot-write capability in the shared grid for %s",
    (lang) => {
      const r = {
        ...report(),
        canEdit: false,
        pokemonEditing: {
          canEdit: true,
          editor: "standard" as const,
          canRaw: true,
          canImport: true,
          canStorage: true,
        },
      };
      const render = (value: SaveReport) =>
        renderToStaticMarkup(
          <SaveBoxGallery
            report={value}
            revision={7}
            scope="scope"
            selected={{ box: 0, slot: 0 }}
            busy={false}
            lang={lang}
            onSelect={() => {}}
            onSwap={async () => {}}
            onDrop={async () => {}}
          />,
        );
      expect(render(r)).toContain('draggable="true"');
      expect(render({ ...r, checksumsValid: false })).not.toContain(
        'draggable="true"',
      );
      expect(
        render({
          ...r,
          pokemonEditing: { ...r.pokemonEditing, canStorage: false },
        }),
      ).not.toContain('draggable="true"');
    },
  );
});
