import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { itemImage } from "./art";
import manifest from "./art-manifest.json";
import hashes from "../../../third_party/pkhex/art-manifest.json";

describe("local inventory artwork", () => {
  it("keeps empty slots empty and uses an explicit unknown image", () => {
    expect(itemImage("")).toBeUndefined();
    expect(itemImage("bitem_65535")).toMatch(/\/bitem_unk\.png$/);
    expect(itemImage("b_1")).toMatch(/\/bitem_unk\.png$/);
    for (const key of ["bitem_17", "bitem_tm", "bitem_tr"])
      expect(itemImage(key)).toContain(`/save-art/26.08.26/${key}.png`);
  });

  it("ships every item mapping as the original PNG with a recorded source hash", () => {
    const items = Object.entries(manifest).filter(([key]) =>
      key.startsWith("bitem_"),
    );
    expect(items.length).toBe(606);
    const sources: Record<string, string> = hashes.files;
    for (const [, filename] of items) {
      const bytes = readFileSync(
        new URL(
          `../../../public/save-art/26.08.26/${filename}`,
          import.meta.url,
        ),
      );
      expect([...bytes.subarray(0, 8)]).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        sources[`PKHeX.Drawing.PokeSprite/Resources/img/Big Items/${filename}`],
      );
    }
  });
});
