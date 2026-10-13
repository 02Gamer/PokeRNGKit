import { describe, expect, it } from "vitest";
import {
  appendSearchInstruction,
  changePokemonSearch,
  newPokemonSearch,
  orderSearchChoices,
  searchCandidateInput,
  type PokemonSearchCatalog,
} from "./pokemonSearch";
describe("source search control state", () => {
  it("maps cleared and unmatched candidates to native GetIndex zero, distinct from Any, and accepts exact text", () => {
    const choices = [
      { id: -1, name: { zh: "任意", en: "Any", ja: "指定なし" } },
      { id: 0, name: { zh: "无", en: "None", ja: "なし" } },
      { id: 25, name: { zh: "皮卡丘", en: "Pikachu", ja: "ピカチュウ" } },
    ];
    expect(searchCandidateInput(choices, "zh", "")).toEqual({
      value: 0,
      index: -1,
      text: "",
    });
    expect(searchCandidateInput(choices, "en", "missing").value).toBe(0);
    expect(searchCandidateInput(choices, "en", "Any").value).toBe(-1);
    expect(searchCandidateInput(choices, "en", "pikachu").value).toBe(25);
    expect(searchCandidateInput(choices, "ja", "ピカチュウ").value).toBe(25);
    expect(searchCandidateInput(choices, "zh", "", -1).value).toBe(-1);
  });
  it("uses source ordinal active-language order, keeps None first when required and retains duplicates", () => {
    const input = [
        { id: 0, name: { zh: "无", en: "None", ja: "なし" } },
        { id: 571, name: { zh: "乙", en: "Z", ja: "い" } },
        { id: 571, name: { zh: "乙", en: "Z", ja: "い" } },
        { id: 1, name: { zh: "甲", en: "A", ja: "あ" } },
      ],
      before = structuredClone(input);
    expect(orderSearchChoices(input, "en", true).map((c) => c.id)).toEqual([
      0, 1, 571, 571,
    ]);
    expect(orderSearchChoices(input, "zh").map((c) => c.name.zh)).toEqual([
      "乙",
      "乙",
      "无",
      "甲",
    ]);
    expect(input).toEqual(before);
  });
  it("resets every condition and owns independent move arrays", () => {
    const a = newPokemonSearch(),
      b = newPokemonSearch();
    a.moves[0] = 1;
    expect(b.moves).toEqual([0, 0, 0, 0]);
    expect(b.shiny).toBeNull();
    expect(b.egg).toBeNull();
    expect(b.nature).toBe(25);
    expect(b.version).toBe(-1);
    expect(b.level).toBe("");
    expect(b.instructions).toBe("");
  });
  it("keeps source generation/version exclusivity and comparison clearing while leaving raw levels for Core", () => {
    const source = { ...newPokemonSearch(), generation: 3, level: "999" },
      before = structuredClone(source);
    const version = changePokemonSearch(source, "version", 3);
    expect(version.generation).toBe(0);
    expect(version.level).toBe("999");
    expect(changePokemonSearch(version, "generation", 7).version).toBe(-1);
    expect(changePokemonSearch(source, "levelComparison", 0).level).toBe("");
    expect(source).toEqual(before);
  });
  it("builds exact readonly-window prefix/property lines, including source-visible mutation prefixes, without running them", () => {
    const catalog = {
      formats: [
        {
          index: 0,
          name: "any",
          fields: [
            {
              name: "Species",
              type: "UInt16",
              present: true,
              hasValue: true,
              value: "25",
            },
          ],
        },
      ],
      prefixes: ["=", "+"],
    } as PokemonSearchCatalog;
    expect(appendSearchInstruction("=PID=1", catalog, 0, "Species", "=")).toBe(
      "=PID=1\n=Species=",
    );
    expect(
      appendSearchInstruction("=PID=1\n", catalog, 0, "Species", "+"),
    ).toBe("=PID=1\n+Species=");
    expect(() =>
      appendSearchInstruction("", catalog, 0, "Missing", "="),
    ).toThrow();
    expect(() =>
      appendSearchInstruction("", catalog, 0, "Species", "."),
    ).toThrow();
    expect(() =>
      appendSearchInstruction("x".repeat(32767), catalog, 0, "Species", "="),
    ).toThrow();
  });
});
