// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Trainer9aEditor } from "./Trainer9aEditor";
import { SaveTrainerImage } from "./SaveTrainerImage";
import { saveEditorResources, localizeSaveError } from "./locales";
import { SAVE_SECTION_GROUPS } from "./saveWorkspace";
import {
  tr9aConfirmation,
  tr9aDraft,
  tr9aRequest,
  tr9aScrewText,
  tr9aWords,
  supportsTrainer9a,
  type Tr9aCatalog,
  type Tr9aTicket,
} from "./trainer9a";
const catalog: Tr9aCatalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  revision: 1,
  name: "TRAINER",
  nameTrash: "00".repeat(26),
  id: 123,
  tid: 123,
  sid: 0,
  tsv: 0,
  gender: 0,
  language: 2,
  money: 100,
  royaleRegular: 111,
  royaleInfinite: 222,
  hours: 1,
  minutes: 2,
  seconds: 3,
  saved: "2024-01-02T03:04:05",
  map: {
    editable: true,
    name: "a0101",
    x: "1",
    y: "2",
    z: "3",
    rotation: "90",
    quaternion: [0, 0, 1, 0],
  },
  dlc: { surveyPoints: 333, streetName: "OLD STREET" },
  images: [],
  remainingScrews: [
    { fieldItem: "itb_a0101_25", x: -611.7629, y: 0.2509685, z: -594.8188 },
  ],
  screwQuantity: 9,
  fashion: Array(13).fill("0"),
  languages: [{ id: 2, name: { zh: "英语", en: "English", ja: "英語" } }],
  trashSpecies: [],
  trashLanguages: [],
  specialChars: [],
};
describe("Trainer9a product contract", () => {
  it("keeps the source 0–100 generation range and Gen9a-only language for name layers", () => {
    const source = {
      ...catalog,
      trashSpecies: [
        { id: 25, name: { zh: "皮卡丘", en: "Pikachu", ja: "ピカチュウ" } },
      ],
      trashLanguages: [
        { id: 10, name: { zh: "西班牙语", en: "Spanish", ja: "スペイン語" } },
      ],
    };
    for (const generation of [0, 9, 100])
      expect(() =>
        tr9aRequest(source, {
          ...tr9aDraft(source),
          nameEvents: [
            {
              action: "layer",
              species: 25,
              language: 10,
              generation,
              uiLanguage: "en",
            },
          ],
        }),
      ).not.toThrow();
    for (const generation of [-1, 101, 1.5])
      expect(() =>
        tr9aRequest(source, {
          ...tr9aDraft(source),
          nameEvents: [
            {
              action: "layer",
              species: 25,
              language: 10,
              generation,
              uiLanguage: "en",
            },
          ],
        }),
      ).toThrow();
  });
  it("isolates ordered events and preserves untouched map text", () => {
    const d = tr9aDraft(catalog);
    d.map = ["invalid"];
    d.mapName = "x".repeat(40);
    d.operations = ["screws", "resetAndCollectScrews", "screws"];
    d.idEvents = [{ tid: "", sid: "4294" }];
    const request = tr9aRequest(catalog, d);
    d.operations.push("technicalMachines");
    d.idEvents[0].sid = "0";
    expect(request.operations).toEqual([
      "screws",
      "resetAndCollectScrews",
      "screws",
    ]);
    expect(request.idEvents?.[0].sid).toBe("4294");
    expect(catalog.map.name).toBe("a0101");
    expect(() => tr9aRequest(catalog, { ...d, mapUpdated: true })).toThrow();
  });
  it("uses source widths rather than smaller shortcuts and gates DLC", () => {
    const d = tr9aDraft(catalog);
    expect(() => tr9aRequest(catalog, { ...d, hours: "" })).toThrow();
    expect(() =>
      tr9aRequest(catalog, { ...d, money: "", minutes: "", seconds: "" }),
    ).not.toThrow();
    expect(() =>
      tr9aRequest(catalog, {
        ...d,
        royaleRegular: "9999999",
        royaleInfinite: "9999999",
        surveyPoints: "9999999",
        hours: "65535",
      }),
    ).not.toThrow();
    for (const patch of [
      { hours: "65536" },
      { money: "10000000" },
      { streetName: "x".repeat(19) },
      { mapUpdated: true, mapName: "x".repeat(33) },
      { mapUpdated: true, map: ["0.0000001", "0", "0", "0"] },
    ])
      expect(() => tr9aRequest(catalog, { ...d, ...patch })).toThrow();
    const base = { ...catalog, revision: 0, dlc: null };
    expect(tr9aDraft(base).surveyPoints).toBeUndefined();
    expect(() => tr9aRequest(base, tr9aDraft(base))).not.toThrow();
    expect(() => tr9aRequest(base, d)).toThrow();
  });
  it("checks the exact frozen hashes and keeps source location coordinates", () => {
    const ticket: Tr9aTicket = {
      token: "trainer9a:1",
      sourceHash: catalog.sourceHash,
      targetHash: "B".repeat(64),
      before: catalog,
      result: { ...catalog, sourceHash: "B".repeat(64) },
      changedOffsets: [],
      operations: [],
    };
    expect(tr9aConfirmation(catalog, ticket).targetHash).toBe(
      ticket.targetHash,
    );
    expect(() =>
      tr9aConfirmation(catalog, { ...ticket, result: catalog }),
    ).toThrow();
    expect(() =>
      tr9aConfirmation(catalog, { ...ticket, token: "trainer9:1" }),
    ).toThrow();
    expect(tr9aScrewText(catalog)).toBe(
      "itb_a0101_25 at (-611.7629, 0.2509685, -594.8188)",
    );
  });
  it.each(["zh", "en", "ja"] as const)(
    "localizes the official trainer entry and errors in %s",
    (lang) => {
      expect(SAVE_SECTION_GROUPS.trainer).toContain("trainer9a");
      expect(supportsTrainer9a("SAV9ZA")).toBe(true);
      expect(supportsTrainer9a("SAV9SV")).toBe(false);
      const html = renderToStaticMarkup(
        <Trainer9aEditor
          revision={0}
          busy={false}
          lang={lang}
          onRead={async () => undefined}
          onPreview={async () => undefined}
          onApply={async () => false}
          onDiscard={async () => {}}
        />,
      );
      expect(html).toContain(tr9aWords[lang].title);
      expect(
        localizeSaveError("Invalid Trainer9a date.", saveEditorResources[lang]),
      ).toBe(tr9aWords[lang].invalid);
      expect(
        localizeSaveError(
          "Trainer9a preview is stale.",
          saveEditorResources[lang],
        ),
      ).toBe(tr9aWords[lang].stale);
    },
  );
  it("disables all exports when image pixels cannot be displayed", () => {
    const html = renderToStaticMarkup(
      <SaveTrainerImage
        image={{
          key: "current",
          available: true,
          width: 4,
          height: 4,
          pixels: "invalid",
          error: null,
        }}
        fileName="KPictureSBCData"
        title="Current"
        exportLabel="Export"
        unavailable="Unavailable"
      />,
    );
    expect(html).toContain("Unavailable");
    expect(html.match(/disabled=""/g)).toHaveLength(3);
    expect(html).not.toContain("<canvas");
  });
});
