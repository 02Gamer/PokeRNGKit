import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Trainer9Editor } from "./Trainer9Editor";
import {
  tr9Bmp,
  tr9Confirmation,
  tr9Draft,
  tr9Pixels,
  tr9Request,
  tr9Words,
  supportsTrainer9,
  type Tr9Catalog,
  type Tr9Image,
  type Tr9Ticket,
} from "./trainer9";
const catalog: Tr9Catalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  revision: 2,
  name: "TRAINER",
  id: 123,
  gender: 0,
  language: 2,
  version: "SL",
  money: 123,
  leaguePoints: 456,
  hours: 1,
  minutes: 2,
  seconds: 3,
  enrollment: "2020-01-01T00:00:00",
  saved: "2020-01-02T03:04:05",
  map: {
    editable: true,
    x: "1",
    y: "2",
    z: "3",
    rotation: "90",
    quaternion: [0, 0, 1, 0],
  },
  blueberry: { points: 789, solo: 1, group: 2, throwStyle: 1, throwStyles: [] },
  images: [],
  languages: [],
};
describe("Trainer9 frontend", () => {
  it("preserves map flag/raw values and detaches source requests", () => {
    const d = tr9Draft(catalog);
    expect(d.mapUpdated).toBe(false);
    expect(d.map).toEqual(["1", "2", "3", "90"]);
    const request = tr9Request(catalog, d);
    d.map[0] = "9";
    expect(request.map[0]).toBe("1");
    expect(catalog.map.x).toBe("1");
  });
  it("matches source text widths and full UInt32 ID bounds", () => {
    const d = tr9Draft(catalog);
    expect(() => tr9Request(catalog, { ...d, id: 4294967295 })).not.toThrow();
    for (const patch of [
      { id: 4294967296 },
      { name: "1234567890123" },
      { money: "12345678" },
      { minutes: "123" },
      { hours: "abc" },
    ])
      expect(() => tr9Request(catalog, { ...d, ...patch })).toThrow();
  });
  it("rejects stale frozen source/target/token", () => {
    const t: Tr9Ticket = {
      token: "trainer9:1",
      sourceHash: catalog.sourceHash,
      targetHash: "B".repeat(64),
      before: catalog,
      result: { ...catalog, sourceHash: "B".repeat(64) },
      changedOffsets: [1],
      operations: [],
    };
    expect(tr9Confirmation(catalog, t).token).toBe("trainer9:1");
    for (const patch of [
      { sourceHash: t.targetHash },
      { targetHash: catalog.sourceHash },
      { token: "other:1" },
    ])
      expect(() => tr9Confirmation(catalog, { ...t, ...patch })).toThrow();
  });
  it("exports exact bottom-up BGR BMP rows with padding and checked RGBA", () => {
    const pixels = new Uint8Array([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
    ]);
    const image: Tr9Image = {
      key: "photo",
      available: true,
      width: 2,
      height: 2,
      pixels: btoa(Array.from(pixels, (c) => String.fromCharCode(c)).join("")),
      error: null,
    };
    expect(tr9Pixels(image)).toEqual(new Uint8ClampedArray(pixels));
    const bmp = tr9Bmp(image),
      view = new DataView(bmp.buffer);
    expect(String.fromCharCode(...bmp.slice(0, 2))).toBe("BM");
    expect(view.getUint32(2, true)).toBe(70);
    expect(view.getUint32(10, true)).toBe(54);
    expect(view.getInt32(18, true)).toBe(2);
    expect([...bmp.slice(54, 62)]).toEqual([255, 0, 0, 255, 255, 255, 0, 0]);
    expect(() => tr9Pixels({ ...image, width: 3 })).toThrow();
    expect(() => tr9Pixels({ ...image, width: 999999 })).toThrow();
  });
  it.each(["zh", "en", "ja"] as const)(
    "uses shared controls and localized loading in %s",
    (lang) => {
      const html = renderToStaticMarkup(
        <Trainer9Editor
          revision={1}
          busy={true}
          lang={lang}
          onRead={async () => undefined}
          onPreview={async () => undefined}
          onApply={async () => false}
          onDiscard={async () => {}}
        />,
      );
      expect(html).toContain(tr9Words[lang].title);
      expect(html).toContain("save-editor-toolbar");
      expect(html).toContain("disabled");
    },
  );
  it("keeps other save families outside this source editor", () => {
    expect(supportsTrainer9("SAV9SV")).toBe(true);
    expect(supportsTrainer9("SAV9ZA")).toBe(false);
  });
});
