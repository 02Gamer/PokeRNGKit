import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SaveBoxViewer } from "./SaveBoxViewer";
import {
  boxViewIndex,
  moveBoxView,
  swapBoxViews,
  currentBoxEdit,
} from "./boxViewer";
import type { SaveReport } from "./domain";

const report = () =>
  ({
    boxCount: 3,
    boxSlotCount: 30,
    partyCount: 0,
    pokemon: [],
    boxes: [
      { index: 0, name: "Main", wallpaper: 0 },
      { index: 1, name: "Second", wallpaper: 1 },
      { index: 2, name: "Empty", wallpaper: 2 },
    ],
    generation: 3,
    format: "SAV3E",
    version: "E",
    canEdit: true,
    checksumsValid: true,
    boxOptions: {
      currentBox: 0,
      canSetCurrentBox: true,
      canName: false,
      nameLength: 8,
      wallpapers: [],
      unlocked: null,
      flags: [],
      flagMaximum: 255,
      canSwap: true,
      batchActions: [],
    },
  }) as unknown as SaveReport;

describe("independent second box viewer", () => {
  it("matches source wraparound, exact edge commands and invalid loaded selection fallback", () => {
    expect(moveBoxView(0, 3, -1)).toBe(2);
    expect(moveBoxView(2, 3, 1)).toBe(0);
    expect(moveBoxView(2, 3, -1, true)).toBe(0);
    expect(moveBoxView(0, 3, 1, true)).toBe(2);
    expect(boxViewIndex(255, 3)).toBe(0);
    expect(boxViewIndex(-1, 3)).toBe(0);
    expect(() => boxViewIndex(0, 0)).toThrow();
  });
  it("exchanges view indexes without constructing a data-swap request", () => {
    expect(swapBoxViews(0, 2, 3)).toEqual({ main: 2, secondary: 0 });
    expect(swapBoxViews(1, 1, 3)).toEqual({ main: 1, secondary: 1 });
    expect(swapBoxViews(255, 1, 3)).toEqual({ main: 1, secondary: 0 });
  });
  it("creates only supported changed current-box metadata, independently of Pokémon edit availability", () => {
    const r = report();
    expect(currentBoxEdit(r, 0)).toBeUndefined();
    const readOnlyReport = { ...r, canEdit: false };
    expect(currentBoxEdit(readOnlyReport, 2)).toEqual({
      box: 2,
      name: null,
      wallpaper: null,
      currentBox: 2,
    });
    expect(currentBoxEdit({ ...r, checksumsValid: false }, 2)).toBeUndefined();
    r.boxOptions.canSetCurrentBox = false;
    expect(currentBoxEdit(r, 2)).toBeUndefined();
    expect(() => currentBoxEdit(r, 3)).toThrow();
    expect(() => currentBoxEdit(r, 0.5)).toThrow();
  });
  it.each(["zh", "en", "ja"] as const)(
    "renders two independent physical grids and shared controls in %s",
    (lang) => {
      const r = report(),
        before = JSON.stringify(r);
      const html = renderToStaticMarkup(
        <SaveBoxViewer
          report={r}
          main={0}
          secondary={2}
          selected={{ box: 2, slot: 29 }}
          busy={false}
          lang={lang}
          revision={4}
          scope="current-file"
          onMain={() => {}}
          onSecondary={() => {}}
          onSelect={() => {}}
          onSwapViews={() => {}}
          onDrop={async () => {}}
        />,
      );
      expect(html.match(/data-slot=/g)).toHaveLength(60);
      expect(html).toContain('data-box="0"');
      expect(html).toContain('data-box="2"');
      expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
      expect(html.match(/haku-select-trigger/g)).toHaveLength(2);
      expect(html).toContain("save-art/26.08.26/");
      expect(JSON.stringify(r)).toBe(before);
    },
  );
});
