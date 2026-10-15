// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { legalityDisplay } from "./legalityDisplay";
import type { PokemonLegalityReport } from "./domain";
const text = { zh: "中文报告", en: "Report", ja: "レポート" };
const report: PokemonLegalityReport = {
  box: 0,
  slot: 0,
  parsed: true,
  valid: true,
  summary: text,
  details: text,
  clipboard: text,
};
describe("source legality display policy", () => {
  it("uses Control-only XOR for the source default expansion", () => {
    for (const alwaysVerbose of [true, false])
      for (const controlOnly of [true, false])
        expect(
          legalityDisplay({ ...report, alwaysVerbose }, controlOnly).expanded,
        ).toBe(alwaysVerbose !== controlOnly);
  });
  it("honors native suppression and clipboard availability without copying automatically", () => {
    expect(legalityDisplay({ ...report, hideReport: true })).toMatchObject({
      hidden: true,
    });
    expect(legalityDisplay({ ...report, canCopy: false })).toMatchObject({
      canCopy: false,
    });
    expect(legalityDisplay({ ...report, clipboard: null })).toMatchObject({
      canCopy: false,
    });
    expect(legalityDisplay(report)).toMatchObject({
      hidden: false,
      canCopy: true,
    });
  });
});
