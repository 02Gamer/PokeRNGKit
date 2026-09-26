import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ribbonImage } from "./art";
import manifest from "./art-manifest.json";
import provenance from "../../../third_party/pkhex/art-manifest.json";

describe("PKHeX ribbon artwork", () => {
  it("covers every editable ribbon field across its valid count range", () => {
    const bindings = readFileSync("wasm/pkhex/PokemonRibbonFields.cs", "utf8");
    const fields = [
      ...bindings.matchAll(/fields\.Add\(new\("(Ribbon\w+)", (\d+),/g),
    ];
    expect(fields.length).toBeGreaterThan(100);
    for (const [, key, maxText] of fields) {
      const max = Number(maxText);
      for (let value = 0; value <= max; value++) {
        expect(
          ribbonImage(key, max, value, 8),
          `${key}/${value}`,
        ).toBeDefined();
        expect(
          ribbonImage(key, max, value, 9),
          `${key}/${value}/Gen9`,
        ).toBeDefined();
      }
    }
  });

  it("keeps the original resource bytes and local mapping", () => {
    const entries = Object.entries(manifest).filter(([key]) =>
      key.startsWith("ribbon"),
    );
    expect(entries).toHaveLength(161);
    for (const [, filename] of entries) {
      const source = Object.entries(provenance.files).find(([path]) =>
        path.endsWith(`/ribbons/${filename}`),
      );
      expect(source, filename).toBeDefined();
      const bytes = readFileSync(`public/save-art/26.08.26/${filename}`);
      expect(createHash("sha256").update(bytes).digest("hex"), filename).toBe(
        source![1],
      );
      expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    }
  });

  it("uses rank artwork and generation-specific memory thresholds", () => {
    expect(ribbonImage("RibbonChampionG3", 1, 1, 3)).toContain(
      "ribbonchampiong3.png",
    );
    expect(ribbonImage("RibbonCountG3Cool", 4, 0, 3)).toContain(
      "ribbong3cool.png",
    );
    expect(ribbonImage("RibbonCountG3Cool", 4, 1, 3)).toContain(
      "ribbong3cool.png",
    );
    expect(ribbonImage("RibbonCountG3Cool", 4, 2, 3)).toContain(
      "ribbong3coolsuper.png",
    );
    expect(ribbonImage("RibbonCountG3Cool", 4, 3, 3)).toContain(
      "ribbong3coolhyper.png",
    );
    expect(ribbonImage("RibbonCountG3Cool", 4, 4, 3)).toContain(
      "ribbong3coolmaster.png",
    );
    expect(ribbonImage("RibbonCountMemoryContest", 40, 39, 8)).toContain(
      "ribboncountmemorycontest.png",
    );
    expect(ribbonImage("RibbonCountMemoryContest", 40, 40, 8)).toContain(
      "ribboncountmemorycontest2.png",
    );
    expect(ribbonImage("RibbonCountMemoryBattle", 8, 7, 8)).toContain(
      "ribboncountmemorybattle.png",
    );
    expect(ribbonImage("RibbonCountMemoryBattle", 8, 7, 9)).toContain(
      "ribboncountmemorybattle2.png",
    );
    expect(ribbonImage("RibbonCountMemoryBattle", 8, 8, 8)).toContain(
      "ribboncountmemorybattle2.png",
    );
    expect(ribbonImage("RibbonUnknown", 1, 1, 8)).toBeUndefined();
  });
});
