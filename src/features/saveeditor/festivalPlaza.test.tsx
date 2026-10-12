import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FestivalPlazaEditor } from "./FestivalPlazaEditor";
import {
  festaConfirmation,
  festaDraft,
  festaRequest,
  festaWords,
  supportsFestivalPlaza,
  type FestaCatalog,
  type FestaFacility,
  type FestaTicket,
} from "./festivalPlaza";
import { festivalTypes, festivalNpc, festivalRewards } from "./festivalOptions";
import { festivalPhrases } from "./festivalPhrases";
const facility: FestaFacility = {
  index: 0,
  type: 0,
  category: 0,
  color: 7,
  colorMaximum: 3,
  introduced: false,
  rawIntroduced: 2,
  gender: 255,
  trainerName: "NAME",
  messages: [1, 2, 3, 4],
  luckyRank: 0,
  luckyPlace: 255,
  usedFlags: 0xffffffff,
  usedStats: 0x80000000,
  npc: 999,
  trainerId: "A5".repeat(12),
  exchangeLeft: 255,
};
const catalog: FestaCatalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  usum: false,
  name: "PLAZA",
  coins: 0,
  usedCoins: 0,
  totalCoins: 0,
  rank: 1,
  date: null,
  messages: [0, 0, 0, 0],
  phrases: Array(107).fill(false),
  rewards: Array(11).fill(0),
  facilities: [facility],
  agency: null,
};
describe("Festival Plaza frontend", () => {
  it.each(["zh", "en", "ja"] as const)(
    "preserves source option counts/order in %s",
    (lang) => {
      const sm = festivalTypes(false, lang),
        usum = festivalTypes(true, lang);
      expect(sm).toHaveLength(125);
      expect(usum).toHaveLength(128);
      expect(usum.slice(0, 125)).toEqual(sm);
      expect(festivalNpc[lang]).toHaveLength(8);
      expect(festivalRewards[lang]).toHaveLength(11);
      expect(festivalPhrases[lang]).toHaveLength(107);
      expect(new Set(sm).size).toBe(125);
    },
  );
  it("normalizes only displayed source controls and preserves raw catalog", () => {
    const before = structuredClone(facility),
      draft = festaDraft(catalog, facility);
    expect(draft.color).toBe(3);
    expect(draft.npc).toBe(0);
    expect(draft.gender).toBe(1);
    expect(draft.luckyPlace).toBe(0);
    expect(facility).toEqual(before);
  });
  it("freezes detached ordered actions and rejects request boundaries", () => {
    const actions = [{ kind: "coins", index: 0, value: 123 }];
    const r = festaRequest(catalog, actions, 0, festaDraft(catalog, facility));
    actions[0].value = 456;
    expect(r.actions[0].value).toBe(123);
    expect(() => festaRequest(catalog, [], 7, facility)).toThrow();
    expect(() =>
      festaRequest(catalog, Array(1025).fill(actions[0]), 0, facility),
    ).toThrow();
    expect(() =>
      festaRequest({ ...catalog, canEdit: false }, [], 0, facility),
    ).toThrow();
  });
  it("rejects stale frozen source/target/token", () => {
    const t: FestaTicket = {
      token: "festa:1",
      sourceHash: catalog.sourceHash,
      targetHash: "B".repeat(64),
      before: catalog,
      result: { ...catalog, sourceHash: "B".repeat(64) },
      changedOffsets: [1],
      files: [],
    };
    expect(festaConfirmation(catalog, t).token).toBe("festa:1");
    for (const patch of [
      { sourceHash: t.targetHash },
      { targetHash: catalog.sourceHash },
      { token: "other:1" },
    ])
      expect(() => festaConfirmation(catalog, { ...t, ...patch })).toThrow();
  });
  it.each(["zh", "en", "ja"] as const)(
    "uses shared controls and localized loading in %s",
    (lang) => {
      const html = renderToStaticMarkup(
        <FestivalPlazaEditor
          revision={1}
          busy={true}
          lang={lang}
          onRead={async () => undefined}
          onPreview={async () => undefined}
          onApply={async () => false}
          onDiscard={async () => {}}
        />,
      );
      expect(html).toContain(festaWords[lang].title);
      expect(html).toContain("save-editor-toolbar");
      expect(html).toContain("disabled");
    },
  );
  it("opens only SM/USUM source families", () => {
    expect(supportsFestivalPlaza("SAV7SM")).toBe(true);
    expect(supportsFestivalPlaza("SAV7USUM")).toBe(true);
    expect(supportsFestivalPlaza("SAV7b")).toBe(false);
  });
});
