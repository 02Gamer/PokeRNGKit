import { describe, expect, it } from "vitest";
import {
  misc8bAction,
  misc8bFrozen,
  supportsMisc8b,
  type Misc8bCatalog,
} from "./misc8b";
import { misc8bWords } from "./misc8bWords";
import { localizeSaveError, saveEditorResources } from "./locales";
const catalog = (): Misc8bCatalog => ({
  canEdit: true,
  sourceHash: "A".repeat(64),
  actions: [
    { key: "zones", enabled: true },
    { key: "boxLegend", enabled: false },
  ],
  values: [],
});
describe("BDSP miscellaneous source actions", () => {
  it("requires the actual BDSP container", () => {
    expect(supportsMisc8b("SAV8BS")).toBe(true);
    expect(supportsMisc8b("SAV4DP")).toBe(false);
  });
  it("enforces source readiness, unknown actions and checksums", () => {
    const c = catalog();
    expect(misc8bAction(c, "zones").action).toBe("zones");
    expect(() => misc8bAction(c, "boxLegend")).toThrow();
    expect(() => misc8bAction(c, "unknown")).toThrow();
    expect(() => misc8bAction({ ...c, canEdit: false }, "zones")).toThrow();
  });
  it("binds preview to complete source and target hashes", () => {
    const c = catalog(),
      target = "B".repeat(64),
      request = { ...misc8bAction(c, "zones"), targetHash: target };
    expect(
      misc8bFrozen(c, {
        request,
        result: { ...c, sourceHash: target },
        changedOffsets: [1],
      }),
    ).toEqual(request);
    expect(() =>
      misc8bFrozen(c, { request, result: c, changedOffsets: [] }),
    ).toThrow();
    expect(() =>
      misc8bFrozen(c, {
        request: { ...request, action: "boxLegend" },
        result: { ...c, sourceHash: target },
        changedOffsets: [],
      }),
    ).toThrow();
  });
  it("uses active-language operation messages", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(
        localizeSaveError("Misc8b unavailable", saveEditorResources[lang]),
      ).toBe(misc8bWords[lang].invalid);
      expect(
        localizeSaveError("Misc8b target stale", saveEditorResources[lang]),
      ).toBe(misc8bWords[lang].stale);
      expect(Object.keys(misc8bWords[lang].actions)).toHaveLength(10);
    }
  });
});
