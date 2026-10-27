// SPDX-License-Identifier: GPL-3.0-or-later
import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SaveBoxGrid } from "./SaveBoxGrid";
import { SaveBoxGallery } from "./SaveBoxGallery";
import { SaveBoxViewer } from "./SaveBoxViewer";
import { useBoxPointerDrag } from "./useBoxPointerDrag";
import type { PokemonEntry, SaveReport } from "./domain";

vi.mock("./useBoxPointerDrag", () => ({
  useBoxPointerDrag: vi.fn(() => ({
    rootRef: { current: null },
    pointerDown: () => {},
    preview: undefined,
    failed: false,
  })),
}));
const entry = (box: number, slot: number) =>
  ({
    box,
    slot,
    species: 25,
    nickname: "Partner",
    speciesName: { zh: "皮卡丘", en: "Pikachu", ja: "ピカチュウ" },
    level: 5,
    valid: true,
    sprite: "b_25",
    shiny: false,
    egg: false,
  }) as PokemonEntry;
const report = {
  boxCount: 3,
  boxSlotCount: 30,
  partyCount: 1,
  pokemon: [entry(-1, 0), entry(0, 2), entry(2, 29)],
  boxes: [0, 1, 2].map((index) => ({
    index,
    name: `Box ${index + 1}`,
    wallpaper: index,
  })),
  generation: 3,
  format: "SAV3E",
  version: "E",
  canEdit: true,
  checksumsValid: true,
  boxOptions: { canSwap: true },
} as SaveReport;
const onPointerDrop = vi.fn(async () => {});
const props = {
  report,
  revision: 6,
  scope: "current-save",
  selected: { box: 0, slot: 2 },
  busy: false,
  lang: "zh" as const,
  onSelect: () => {},
  onDrop: async () => {},
  onPointerDrop,
};
const configurations = () =>
  vi.mocked(useBoxPointerDrag).mock.calls.map(([config]) => config);
beforeEach(() => vi.mocked(useBoxPointerDrag).mockClear());

it("connects the single-box controller to the physical slots and existing pointer drop callback", () => {
  const html = renderToStaticMarkup(
    <SaveBoxGrid {...props} box={0} dropMode="copy" />,
  );
  const [config] = configurations();
  expect(config).toMatchObject({
    scope: "current-save",
    revision: 6,
    box: 0,
    count: 30,
    writable: true,
    mode: "copy",
    onPointerDrop,
  });
  expect([...config.entries.keys()]).toEqual([2]);
  expect(html.match(/data-slot=/g)).toHaveLength(30);
  expect(html).toContain('data-box-pointer-grid="true"');
});
it("connects every all-box view with the same revision, mode and target handler", () => {
  renderToStaticMarkup(
    <SaveBoxGallery {...props} dropMode="overwrite" onSwap={async () => {}} />,
  );
  const configs = configurations();
  expect(configs.map((config) => config.box)).toEqual([0, 1, 2]);
  for (const config of configs)
    expect(config).toMatchObject({
      scope: "current-save",
      revision: 6,
      count: 30,
      writable: true,
      mode: "overwrite",
      onPointerDrop,
    });
  expect(configs.map((config) => [...config.entries.keys()])).toEqual([
    [2],
    [],
    [29],
  ]);
});
it("connects both dual-box panes without mapping their visible order to a slot number", () => {
  renderToStaticMarkup(
    <SaveBoxViewer
      {...props}
      main={2}
      secondary={0}
      dropMode="auto"
      onMain={() => {}}
      onSecondary={() => {}}
      onSwapViews={() => {}}
    />,
  );
  const configs = configurations();
  expect(configs.map((config) => config.box)).toEqual([2, 0]);
  expect(configs.map((config) => [...config.entries.keys()])).toEqual([
    [29],
    [2],
  ]);
  for (const config of configs)
    expect(config.onPointerDrop).toBe(onPointerDrop);
});
it("retains native-only callers and rejects party, busy or checksum-invalid mouse sources", () => {
  for (const change of [
    { box: -1 },
    { box: 0, busy: true },
    { box: 0, report: { ...report, checksumsValid: false } },
  ]) {
    vi.mocked(useBoxPointerDrag).mockClear();
    renderToStaticMarkup(<SaveBoxGrid {...props} {...change} />);
    expect(configurations()[0].writable).toBe(false);
  }
  vi.mocked(useBoxPointerDrag).mockClear();
  const html = renderToStaticMarkup(
    <SaveBoxGrid {...props} box={0} onPointerDrop={undefined} />,
  );
  expect(configurations()[0].onPointerDrop).toBeUndefined();
  expect(html).toContain('draggable="true"');
});
