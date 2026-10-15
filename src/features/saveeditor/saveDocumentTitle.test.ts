// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { saveDocumentTitle } from "./saveDocumentTitle";
import type { SaveReport } from "./domain";
describe("save title privacy", () => {
  const report = {
    format: "SAV3E",
    version: "E",
    ot: "Trainer",
    gameName: { zh: "绿宝石", en: "Emerald", ja: "エメラルド" },
  } as SaveReport;
  it("uses the active language and removes both identities when hidden", () => {
    expect(saveDocumentTitle(report, "private.sav", "zh", false)).toBe(
      "PokeRNGKit - SAV3E: private.sav [Trainer (绿宝石)]",
    );
    for (const lang of ["zh", "en", "ja"] as const) {
      const title = saveDocumentTitle(report, "private.sav", lang, true);
      expect(title).toContain(report.gameName![lang]);
      expect(title).not.toContain("private.sav");
      expect(title).not.toContain("Trainer");
    }
  });
});
