import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatterEditor } from "./ChatterEditor";
import {
  chatterBytes,
  chatterConfirmation,
  chatterImport,
  chatterInitialized,
  chatterRequest,
  chatterWords,
  supportsChatter,
  validateChatterCatalog,
  type ChatterCatalog,
  type ChatterTicket,
} from "./chatter";
import { localizeSaveError, saveEditorResources } from "./locales";
const sourceHash = "A".repeat(64),
  targetHash = "B".repeat(64);
const catalog: ChatterCatalog = {
  canEdit: true,
  sourceHash,
  initialized: false,
  rawInitialized: 2,
  confusionChance: 1,
  canPlay: false,
  pcmSize: 1000,
  pcm: btoa("\0".repeat(1000)),
  wav: btoa("\0".repeat(2044)),
};
describe("Chatter frontend boundary", () => {
  it("preserves all byte values and requires exact PCM size", () => {
    const bytes = Uint8Array.from({ length: 1000 }, (_, i) => i % 256),
      before = bytes.slice();
    const action = chatterImport(bytes);
    expect(action.kind).toBe("import");
    if (action.kind !== "import") throw Error("Expected import");
    expect(chatterBytes(action.pcm, 1000)).toEqual(before);
    expect(bytes).toEqual(before);
    for (const size of [999, 1001])
      expect(() => chatterImport(new Uint8Array(size))).toThrow();
    expect(() => chatterBytes("bad%", 1000)).toThrow();
  });
  it("keeps ordered source events detached from mutable drafts", () => {
    const actions = [
      { kind: "initialized" as const, initialized: true },
      chatterImport(new Uint8Array(1000)),
      { kind: "initialized" as const, initialized: false },
    ];
    const request = chatterRequest(catalog, actions);
    expect(chatterInitialized(catalog, request.actions)).toBe(false);
    expect(chatterInitialized(catalog, actions.slice(0, 2))).toBe(true);
    actions[0] = { kind: "initialized", initialized: false };
    expect(request.actions[0]).toEqual({
      kind: "initialized",
      initialized: true,
    });
    expect(() =>
      chatterRequest(
        catalog,
        Array.from({ length: 513 }, () => ({
          kind: "initialized",
          initialized: true,
        })),
      ),
    ).toThrow();
    expect(() => chatterRequest({ ...catalog, canEdit: false }, [])).toThrow();
  });
  it("rejects stale frozen previews and malformed catalogs", () => {
    const ticket: ChatterTicket = {
      token: "chatter:3",
      sourceHash,
      targetHash,
      before: catalog,
      result: {
        ...catalog,
        sourceHash: targetHash,
        initialized: true,
        rawInitialized: 1,
      },
      changedOffsets: [20],
      changedPcmBytes: 0,
    };
    expect(chatterConfirmation(catalog, ticket)).toEqual({
      token: "chatter:3",
      sourceHash,
      targetHash,
    });
    for (const patch of [
      { sourceHash: targetHash },
      { targetHash: sourceHash },
      { token: "other:3" },
    ])
      expect(() =>
        chatterConfirmation(catalog, { ...ticket, ...patch }),
      ).toThrow();
    for (const patch of [
      { pcmSize: 999 },
      { rawInitialized: -1 },
      { confusionChance: 101 },
      { wav: "" },
    ])
      expect(() => validateChatterCatalog({ ...catalog, ...patch })).toThrow();
  });
  it("uses only the five verified Core save families", () => {
    for (const name of ["SAV4DP", "SAV4Pt", "SAV4HGSS", "SAV5BW", "SAV5B2W2"])
      expect(supportsChatter(name)).toBe(true);
    for (const name of ["SAV4BR", "SAV3E", "SAV6XY"])
      expect(supportsChatter(name)).toBe(false);
  });
  it.each(["zh", "en", "ja"] as const)(
    "shares toolbar controls and localized errors in %s",
    (lang) => {
      const html = renderToStaticMarkup(
        <ChatterEditor
          revision={1}
          busy={true}
          lang={lang}
          onRead={async () => undefined}
          onPreview={async () => undefined}
          onApply={async () => false}
          onDiscard={async () => {}}
        />,
      );
      expect(html).toContain("save-editor-toolbar");
      expect(html).toContain(chatterWords[lang].title);
      expect(html).toContain("disabled");
      expect(
        localizeSaveError(
          "Chatter preview is stale.",
          saveEditorResources[lang],
        ),
      ).toBe(chatterWords[lang].stale);
      expect(
        localizeSaveError(
          "Chatter PCM must contain exactly 1000 bytes.",
          saveEditorResources[lang],
        ),
      ).toBe(chatterWords[lang].invalid);
    },
  );
});
