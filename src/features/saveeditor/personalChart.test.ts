import { describe, expect, it } from "vitest";
import {
  chartColumns,
  chartRows,
  chartValue,
  moveChartColumn,
  type PersonalChartRow,
} from "./personalChart";
const text = (zh: string, en = zh, ja = zh) => ({ zh, en, ja });
const row = (species: number, form: number, bst: number): PersonalChartRow => ({
  species,
  form,
  number:
    String(species).padStart(3, "0") +
    (form ? "-" + String(form).padStart(2, "0") : ""),
  sprite: `b_${species}`,
  name: text("火龙", "Dragon", "ドラゴン"),
  native: true,
  bst,
  catchRate: 45,
  type1: { id: 9, name: text("火", "Fire", "ほのお") },
  type2: null,
  stats: [78, 84, 78, 109, 85, 100],
  statColors: Array(6).fill("#FFFF99"),
  bstColor: "#FFFF99",
  abilityIds: [66, 0, 94],
  abilities: [
    text("猛火", "Blaze", "もうか"),
    text("无", "None", "なし"),
    text("太阳之力", "Solar Power", "サンパワー"),
  ],
  alphaMove: null,
  alphaMoveName: null,
});
describe("personal chart", () => {
  it("sorts source padded identifiers with base form before additional forms without changing Core rows", () => {
    const input = [row(25, 0, 320), row(6, 1, 634), row(6, 0, 534)];
    const before = structuredClone(input);
    expect(
      chartRows(input, "", "number", false, "en").map((r) => r.number),
    ).toEqual(["006", "006-01", "025"]);
    expect(chartRows(input, "", "bst", true, "zh").map((r) => r.bst)).toEqual([
      634, 534, 320,
    ]);
    expect(input).toEqual(before);
  });
  it.each(["zh", "en", "ja"] as const)(
    "searches active-language attributes and keeps duplicate type blank in %s",
    (lang) => {
      const input = [row(6, 0, 534)];
      expect(
        chartRows(input, input[0].abilities[2][lang], "number", false, lang),
      ).toHaveLength(1);
      expect(
        chartRows(input, input[0].type1.name[lang], "number", false, lang),
      ).toHaveLength(1);
      expect(chartRows(input, "missing", "number", false, lang)).toHaveLength(
        0,
      );
      expect(chartValue(input[0], "type2", lang)).toBe("");
      expect(chartValue(input[0], "spa", lang)).toBe(109);
    },
  );
  it("reorders all columns including ZA alpha using keyboard-equivalent moves and preserves bounds", () => {
    const order = [...chartColumns, "alphaMove" as const];
    const before = [...order];
    expect(moveChartColumn(order, "alphaMove", -1).at(-2)).toBe("alphaMove");
    expect(order).toEqual(before);
    expect(moveChartColumn(order, "number", -1)).toBe(order);
    expect(moveChartColumn(order, "alphaMove", 1)).toBe(order);
  });
});
