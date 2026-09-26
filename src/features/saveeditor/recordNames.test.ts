import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { recordTranslation, saveRecordName } from "./recordNames";

describe("save record names", () => {
  it("covers the vendored generation 6–8 source dictionaries", () => {
    const root = "third_party/pkhex/PKHeX.Core/Saves/Substructures/";
    const records = readFileSync(root + "Records.cs", "utf8").split(
      "RecordList_6",
    )[1];
    const bdsp = readFileSync(root + "Gen8/BS/Record8b.cs", "utf8").split(
      "RecordList_8b",
    )[1];
    const labels = [
      ...(records + bdsp).matchAll(
        /\{\s*(?:\d+|G8BattleTowerSingleWin|G8BattleTowerDoubleWin)\s*,\s*"([^"]+)"\s*\}/g,
      ),
    ].map((m) => m[1]);
    expect(labels.length).toBeGreaterThan(350);
    expect(
      [...new Set(labels)].filter((name) => !recordTranslation(name)),
    ).toEqual([]);
    for (const name of labels) {
      expect(saveRecordName(name, "zh-CN")).not.toBe(name);
      expect(saveRecordName(name, "ja")).not.toBe(name);
    }
  });
  it("retains source names and handles unknown entries without invented meanings", () => {
    expect(saveRecordName("Steps Taken", "en")).toBe("Steps Taken");
    expect(saveRecordName("total_walk", "en")).toBe("Total steps");
    expect(saveRecordName("pretty", "zh-CN")).toContain("未确认");
    expect(saveRecordName("099", "zh-CN")).toBe("未命名记录 099");
    expect(saveRecordName("099", "ja")).toBe("名称不明の記録 099");
    expect(saveRecordName("099", "en")).toBe("Unnamed record 099");
    expect(saveRecordName("future_record", "zh-CN")).toBe("future_record");
  });
});
