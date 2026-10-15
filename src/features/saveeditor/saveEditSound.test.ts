// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import {
  cgear5PreviewHasSound,
  goParkBatchHasSound,
  saveEditHasSound,
  saveCommitHasSound,
} from "./saveEditSound";

it.each([
  ["gsBall2Edit", { action: "enableGsBall" }],
  ["hall3Edit", { action: "party" }],
  ["misc3Edit", { action: "mirage" }],
  ["rtcEdit", { action: "reset" }],
  ["rtcEdit", { action: "berryFix" }],
  ["secretBase3Edit", { action: "trainer" }],
  ["secretBase3Edit", { action: "member" }],
  ...["all", "nonTrainers", "clear"].map<[string, unknown]>((action) => [
    "pokegear4Edit",
    { action },
  ]),
  ["pokeathlon4Edit", { action: "medalsBatch", enabled: true }],
  ["pokeathlon4Edit", { action: "medalsBatch", enabled: false }],
  ["misc4Edit", { action: "all", group: "poketch" }],
  ...["seals", "accessories", "backdrops"].flatMap((group) =>
    ["all", "legal"].map<[string, unknown]>((action) => [
      "misc4Edit",
      { action, group },
    ]),
  ),
  ...["clear", "seen", "caught", "uncaught", "complete"].map<[string, unknown]>(
    (action) => ["pokedex4Edit", { action, species: 0 }],
  ),
  ["video4Import", { index: 0, data: "AQ==" }],
  ["battlePass4Edit", { action: "import" }],
  ["pokedex5Edit", { action: "give", species: 1 }],
  ["pokedex5Edit", { action: "giveNone", species: 649 }],
  ...[
    "clear",
    "seen",
    "caught",
    "uncaught",
    "complete",
    "formsClear",
    "formsFirst",
    "formsAll",
  ].map<[string, unknown]>((action) => [
    "pokedex5Edit",
    { action, species: 0 },
  ]),
  ["misc5Edit", { action: "forestRandom" }],
  ["misc5Edit", { action: "giveProps" }],
  ...["giveAll", "import", "complete", "clear", "calculateRank"].map<
    [string, unknown]
  >((action) => ["medals5Edit", { action }]),
] satisfies [string, unknown][])(
  "matches a verified source sound for %s %j without changing the edit",
  (kind, edit) => {
    const before = structuredClone(edit);
    expect(saveEditHasSound(kind, edit)).toBe(true);
    expect(edit).toEqual(before);
  },
);

it.each([
  ["rtcEdit", { action: "edit" }],
  ["hall3Edit", { action: "member" }],
  ["misc3Edit", { action: "coins" }],
  ["pokegear4Edit", { action: "slots" }],
  ["pokeathlon4Edit", { action: "medal" }],
  ...["clear", "resave", "numbers", "dotImport"].map<[string, unknown]>(
    (action) => ["misc4Edit", { action, group: "seals" }],
  ),
  ["misc4Edit", { action: "all", group: "fly" }],
  ["misc4Edit", { action: "legal", group: "poketch" }],
  ["pokedex4Edit", { action: "complete", species: 25 }],
  ["pokedex4Edit", { action: "complete", species: "0" }],
  ["pokedex4Edit", { action: "entry", species: 0 }],
  ["battlePass4Edit", { action: "deletePokemon" }],
  ["video4Export", {}],
  ["video4Read", {}],
  ["unknownEdit", { action: "all" }],
  ["rtcEdit", null],
  ["video4Import", []],
  ["video4Import", undefined],
  ["pokedex5Edit", { action: "give", species: 0 }],
  ["pokedex5Edit", { action: "give", species: 650 }],
  ["pokedex5Edit", { action: "give", species: 1.5 }],
  ["pokedex5Edit", { action: "giveNone", species: "25" }],
  ["pokedex5Edit", { action: "complete", species: 25 }],
  ["pokedex5Edit", { action: "entry" }],
  ["pokedex5Edit", { action: "dexNavAll", species: 0 }],
  ["misc5Edit", { action: "giveFly" }],
  ["misc5Edit", { action: "patch" }],
  ["medals5Edit", { action: "patch" }],
  ["dlc5Edit", { kind: "video" }],
  ["cgear5Edit", { action: "image" }],
] satisfies [string, unknown][])(
  "keeps unrelated operations silent for %s %j",
  (kind, edit) => expect(saveEditHasSound(kind, edit)).toBe(false),
);

it("does not coerce unexpected field values into source action names", () => {
  const toString = () => "all";
  expect(saveEditHasSound("pokegear4Edit", { action: { toString } })).toBe(
    false,
  );
  expect(
    saveEditHasSound("misc4Edit", {
      action: "all",
      group: { toString: () => "seals" },
    }),
  ).toBe(false);
});

it("acknowledges raw C-Gear import independently from image conversion warnings", () => {
  expect(
    cgear5PreviewHasSound({
      request: { action: "raw", sourceHash: "", data: "" },
      colors: null,
      tiles: null,
    }),
  ).toBe(true);
});

it.each([
  [0, 0, true],
  [16, 255, true],
  [17, 255, false],
  [16, 256, false],
  [17, 256, false],
  [null, 255, false],
  [16, null, false],
  [-1, 255, false],
  [16, -1, false],
  [1.5, 255, false],
  [16, NaN, false],
  [Infinity, 255, false],
] satisfies [number | null, number | null, boolean][])(
  "keeps C-Gear image conversion success distinct from warnings (%s colors, %s tiles)",
  (colors, tiles, expected) => {
    expect(
      cgear5PreviewHasSound({
        request: { action: "image", sourceHash: "", data: "" },
        colors,
        tiles,
      }),
    ).toBe(expected);
  },
);

it.each([
  ["pokedex6Edit", { action: "give", species: 721 }],
  ["pokedex6Edit", { action: "giveNone", species: 1 }],
  ["pokedex6Edit", { action: "formsAll", species: 0 }],
  ["pokedex6Edit", { action: "complete", species: 0 }],
  ["trainer6Edit", { action: "accessories" }],
  ["secretBase6Edit", { action: "import" }],
  ["trainer7Edit", { action: "fashion" }],
  ...["parkClear", "parkDelete", "titles", "fashion"].map<[string, unknown]>(
    (action) => ["trainerGGEdit", { action }],
  ),
  ["zygarde7Edit", { action: "giveAll" }],
  ...["clear", "seen", "caught", "uncaught", "complete"].map<[string, unknown]>(
    (action) => ["pokedex7Edit", { action, index: -1 }],
  ),
  ["pokedex7Edit", { action: "capture", capture: { kind: "all" } }],
  ["pokedex7Edit", { action: "capture", capture: { kind: "sum" } }],
] satisfies [string, unknown][])(
  "matches generation six and seven source operations for %s %j",
  (kind, value) => expect(saveEditHasSound(kind, value)).toBe(true),
);

it.each([
  ["pokedex6Edit", { action: "give", species: 722 }],
  ["pokedex6Edit", { action: "dexNavAll", species: 0 }],
  ["pokedex6Edit", { action: "entry" }],
  ["trainer6Edit", { action: "patch" }],
  ["secretBase6Edit", { action: "export" }],
  ["trainer7Edit", { action: "flyAll" }],
  ["trainerGGEdit", { action: "parkImport" }],
  ["trainerGGEdit", { action: "parkBatch" }],
  ["zygarde7Edit", { action: "patch" }],
  ["pokedex7Edit", { action: "give", index: 1 }],
  ["pokedex7Edit", { action: "complete", index: 1 }],
  ["pokedex7Edit", { action: "capture", capture: { kind: "entry" } }],
  ["pokedex7Edit", { action: "capture", capture: null }],
  ["pokedex7Edit", { action: "capture", capture: [] }],
  [
    "pokedex7Edit",
    { action: "capture", capture: { kind: { toString: () => "all" } } },
  ],
] satisfies [string, unknown][])(
  "leaves unrelated generation six and seven operations silent for %s %j",
  (kind, value) => expect(saveEditHasSound(kind, value)).toBe(false),
);

it.each(["SAV7SM", "SAV7USUM"])(
  "restricts the bean cues to fill and clear for %s",
  (format) => {
    expect(saveEditHasSound("foodEdit", { action: "fill" }, format)).toBe(true);
    expect(saveEditHasSound("foodEdit", { action: "clear" }, format)).toBe(
      true,
    );
    expect(saveEditHasSound("foodEdit", { action: "edit" }, format)).toBe(
      false,
    );
  },
);
it.each(["SAV6XY", "SAV6AO", "SAV4Pt", "SAV8BS", undefined])(
  "does not apply bean cues to another food case or unknown context (%s)",
  (format) => {
    expect(saveEditHasSound("foodEdit", { action: "fill" }, format)).toBe(
      false,
    );
    expect(saveEditHasSound("foodEdit", { action: "clear" }, format)).toBe(
      false,
    );
  },
);
it("only acknowledges GO Park folder import when the source loop finishes", () => {
  const request = { action: "parkBatch" as const, sourceHash: "" };
  const receipt = { placements: [], skipped: [], unplaced: [] as number[] };
  expect(goParkBatchHasSound({ request, receipt })).toBe(true);
  expect(
    goParkBatchHasSound({ request, receipt: { ...receipt, unplaced: [2] } }),
  ).toBe(false);
  expect(goParkBatchHasSound({ request, receipt: null })).toBe(false);
  expect(
    goParkBatchHasSound({
      request: { ...request, action: "parkImport" },
      receipt,
    }),
  ).toBe(false);
  expect(receipt.unplaced).toEqual([]);
});

it.each([
  ["trainer8Edit", { action: "copyParty", team: "card" }],
  ["trainer8Edit", { action: "copyParty", team: "title" }],
  ["trainer8Edit", { action: "fashion" }],
  ["trainer8Edit", { action: "diglett" }],
  ...[
    "spiritomb",
    "shaymin",
    "darkrai",
    "arceus",
    "boxLegend",
    "roamers",
    "zones",
    "defeat",
    "rebattle",
    "fashion",
  ].map<[string, unknown]>((action) => ["misc8bEdit", { action }]),
  ...["seal8bEdit", "underground8bEdit"].flatMap((kind) =>
    ["all", "none"].map<[string, unknown]>((action) => [kind, { action }]),
  ),
  ...["give", "clear", "seen", "caught", "uncaught", "complete", "counts"].map<
    [string, unknown]
  >((action) => ["pokedex8Edit", { action }]),
  ["pokedex8aEdit", { action: "report", species: 25 }],
  ...["clear", "seen", "caught", "uncaught", "complete"].map<[string, unknown]>(
    (action) => ["pokedex8bEdit", { action, species: 0 }],
  ),
] satisfies [string, unknown][])(
  "matches verified generation eight source actions for %s %j",
  (kind, edit) => expect(saveEditHasSound(kind, edit)).toBe(true),
);
it.each([
  ["trainer8Edit", { action: "resetAppearance" }],
  ["trainer8Edit", { action: "team" }],
  ["trainer8Edit", { action: "patch" }],
  ["misc8bEdit", { action: "patch" }],
  ["misc8bEdit", { action: "unknown" }],
  ["seal8bEdit", { action: "resave" }],
  ["seal8bEdit", { action: "patch" }],
  ["underground8bEdit", { action: "resave" }],
  ["underground8bEdit", { action: "patch" }],
  ["pokedex8Edit", { action: "entry" }],
  ["pokedex8aEdit", { action: "advanced" }],
  ["pokedex8aEdit", { action: "entry" }],
  ...["give", "giveNone", "formsClear", "formsRegular", "formsShiny"].map<
    [string, unknown]
  >((action) => ["pokedex8bEdit", { action, species: 25 }]),
  ["pokedex8bEdit", { action: "complete", species: 25 }],
  ["pokedex8bEdit", { action: "national" }],
] satisfies [string, unknown][])(
  "keeps source-silent generation eight edits silent for %s %j",
  (kind, edit) => expect(saveEditHasSound(kind, edit)).toBe(false),
);
it("limits the BDSP poffin cues to fill and clear of its own case", () => {
  for (const action of ["caseFill", "caseClear"]) {
    expect(saveEditHasSound("foodEdit", { action }, "SAV8BS")).toBe(true);
    for (const format of ["SAV4DP", "SAV4Pt", "SAV3E", "SAV7SM", undefined])
      expect(saveEditHasSound("foodEdit", { action }, format)).toBe(false);
  }
  expect(saveEditHasSound("foodEdit", { action: "caseSort" }, "SAV8BS")).toBe(
    false,
  );
  expect(saveEditHasSound("foodEdit", { action: "caseEdit" }, "SAV8BS")).toBe(
    false,
  );
});

it.each(["pokedex9Edit", "pokedex9aEdit"])(
  "matches all six source dex actions and keeps field edits silent for %s",
  (kind) => {
    for (const action of [
      "give",
      "clear",
      "seen",
      "caught",
      "uncaught",
      "complete",
    ])
      expect(saveEditHasSound(kind, { action })).toBe(true);
    expect(saveEditHasSound(kind, { action: "entry" })).toBe(false);
    expect(saveEditHasSound(kind, { action: "unknown" })).toBe(false);
  },
);
it.each([
  ...[
    "fly",
    "stakes",
    "tm",
    "legendaries",
    "coaches",
    "bike",
    "clothing",
    "throwStyles",
  ].map<[string, unknown]>((operation) => ["trainer9Commit", [operation]]),
  ["trainer9aCommit", [{ key: "resetAndCollectScrews", count: 0 }]],
  ["fashion9Commit", [{ action: "owned", owned: true, all: true }]],
  ["fashion9Commit", [{ action: "owned", owned: false, all: false }]],
  ["raid9Commit", [{ action: "propagate", seedToo: false }]],
  ["raid9Commit", [{ action: "propagate", seedToo: true }]],
  ...["randomLv3", "clone", "shiny", "generate", "import", "hex"].map<
    [string, unknown]
  >((action) => ["donut9aCommit", action]),
] satisfies [string, unknown][])(
  "uses verified preview origins for %s %j",
  (kind, origin) => expect(saveCommitHasSound(kind, origin)).toBe(true),
);
it.each([
  ["trainer9Commit", []],
  ["trainer9Commit", ["patch", "unknown"]],
  ["trainer9Commit", { token: "opaque confirmation" }],
  ["trainer9aCommit", [{ key: "screws", count: 10 }]],
  ["trainer9aCommit", [{ key: "technicalMachines", count: 10 }]],
  ["fashion9Commit", [{ action: "rows" }, { action: "import" }]],
  ["raid9Commit", [{ action: "fields" }, { action: "seeds" }]],
  ["donut9aCommit", "patch"],
  ["donut9aCommit", "resave"],
  ["donut9aCommit", "reset"],
  ["donut9aCommit", { action: "clone" }],
  ["unknownCommit", [{ action: "owned" }]],
  ["trainer9Commit", null],
  ["fashion9Commit", [null, "owned", 1, false]],
] satisfies [string, unknown][])(
  "does not infer source operations from unrelated data for %s %j",
  (kind, origin) => expect(saveCommitHasSound(kind, origin)).toBe(false),
);
