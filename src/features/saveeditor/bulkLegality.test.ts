import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  bulkLegalitySourceHash,
  parseBulkLegality,
  bulkLegalityWords,
} from "./bulkLegality";
import { SaveBulkLegalityEditor } from "./SaveBulkLegalityEditor";

const sourceHash = bulkLegalitySourceHash(new Uint8Array());
const report = {
  apiVersion: 183,
  sourceHash,
  clean: true,
  analyzedCount: 0,
  findingCount: 0,
  report: { zh: "合法", en: "Valid", ja: "正常" },
};
describe("stored Pokémon analysis boundary", () => {
  it("hashes the exact byte view without changing the source", () => {
    expect(sourceHash).toBe(
      "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
    );
    const bytes = new Uint8Array([9, 97, 98, 99, 9]);
    expect(bulkLegalitySourceHash(bytes.subarray(1, 4))).toBe(
      "BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD",
    );
    expect([...bytes]).toEqual([9, 97, 98, 99, 9]);
  });
  it("accepts empty clean saves and does not assume finding count equals entity count", () => {
    expect(parseBulkLegality(report, sourceHash)).toBe(report);
    expect(
      parseBulkLegality(
        { ...report, clean: false, analyzedCount: 1, findingCount: 9 },
        sourceHash,
      ).findingCount,
    ).toBe(9);
  });
  it.each([
    null,
    [],
    { ...report, apiVersion: 164 },
    { ...report, sourceHash: "0".repeat(64) },
    { ...report, clean: "true" },
    { ...report, analyzedCount: -1 },
    { ...report, findingCount: 1.5 },
    { ...report, findingCount: 2147483648 },
    { ...report, report: { en: "Valid", zh: "合法" } },
    { ...report, report: [] },
  ])("rejects stale or malformed native results %#", (value) => {
    expect(() => parseBulkLegality(value, sourceHash)).toThrow();
  });
  it("rejects a malformed expected source identity", () => {
    expect(() => parseBulkLegality(report, sourceHash.toLowerCase())).toThrow();
  });
  it.each(["zh", "en", "ja"] as const)(
    "renders localized read-only actions without starting analysis in %s",
    (lang) => {
      let reads = 0;
      const html = renderToStaticMarkup(
        createElement(SaveBulkLegalityEditor, {
          lang,
          busy: true,
          onRead: async () => {
            reads++;
            return undefined;
          },
          onOpenSettings() {},
        }),
      );
      expect(reads).toBe(0);
      expect(html).toContain(bulkLegalityWords[lang].hint);
      expect(html).toContain(bulkLegalityWords[lang].run);
      expect(html.match(/disabled=""/g)).toHaveLength(3);
    },
  );
});
