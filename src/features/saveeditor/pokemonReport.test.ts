import { describe, expect, it } from "vitest";
import {
  reportLabel,
  reportTable,
  type PokemonReportData,
} from "./pokemonReport";
describe("Pokemon report", () => {
  it("localizes trainer labels and stat/move columns while preserving identifiers", () => {
    expect(reportLabel("OT", "zh")).toBe("训练家姓名");
    expect(reportLabel("OT", "ja")).toBe("親の名前");
    expect(reportLabel("IV_ATK", "zh")).toBe("个体值 攻击");
    expect(reportLabel("Move2_PP", "ja")).toBe("技 2 PP");
    expect(reportLabel("ExtraProperty", "en")).toBe("ExtraProperty");
  });
  it("copies visible textual columns in current row order with source header/Markdown conversion", () => {
    const report: PokemonReportData = {
      columns: [
        { name: "Sprite", type: "Image", visible: true, sortable: false },
        { name: "OT", type: "String", visible: true, sortable: true },
        { name: "PID", type: "String", visible: false, sortable: true },
      ],
      rows: [
        {
          sprite: "b_25",
          source: "box",
          box: 4,
          slot: 7,
          cells: ["Red", "0012"],
        },
      ],
    };
    expect(reportTable(report, "zh")).toBe("训练家姓名\r\nRed");
    expect(reportTable(report, "en", true)).toBe(
      "Original trainer name\r\n|:--:|\r\nRed",
    );
    expect(report.rows[0].box).toBe(4);
    expect(
      reportTable(report, "zh", false, {
        startRow: 0,
        endRow: 0,
        startColumn: 1,
        endColumn: 1,
      }),
    ).toBe("训练家姓名\r\nRed");
  });
});
