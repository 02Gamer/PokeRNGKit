// SPDX-License-Identifier: GPL-3.0-or-later
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { genderSymbols, formatGender } from "./genderDisplay";
import { useGenderLabel } from "./useGenderLabel";
import { Select } from "../shared/Select";
const policy = vi.hoisted(() => ({ json: "" }));
vi.mock("./useSaveSettingsJson", () => ({
  useSaveSettingsJson: () => policy.json,
}));
it.each([true, false])(
  "matches source symbol table and retains localized labels in mode %s",
  (unicode) => {
    const symbols = genderSymbols(JSON.stringify({ display: { unicode } }));
    expect(symbols).toEqual(unicode ? ["♂", "♀", "-"] : ["M", "F", "-"]);
    expect(formatGender(symbols, 0, "男")).toBe(unicode ? "男 (♂)" : "男 (M)");
    expect(formatGender(symbols, 1, "Female")).toBe(
      unicode ? "Female (♀)" : "Female (F)",
    );
    expect(formatGender(symbols, 2)).toBe("-");
    expect(formatGender(symbols, 255)).toBe("#255");
    expect(formatGender(symbols, 1.5)).toBe("#1.5");
  },
);
it("retains Unicode default and rejects corrupt policy", () => {
  expect(genderSymbols("")).toEqual(["♂", "♀", "-"]);
  expect(() => genderSymbols("{}")).toThrow();
  expect(() => genderSymbols('{"display":{"unicode":"false"}}')).toThrow();
});
it("renders usable shared Select text for either stored mode", () => {
  function Example() {
    const name = useGenderLabel();
    return (
      <Select value="1">
        <option value="0">{name(0, "男")}</option>
        <option value="1">{name(1, "女")}</option>
      </Select>
    );
  }
  for (const unicode of [true, false]) {
    policy.json = JSON.stringify({ display: { unicode } });
    const html = renderToStaticMarkup(<Example />);
    expect(html).toContain(unicode ? "女 (♀)" : "女 (F)");
    expect(html).toContain('aria-haspopup="listbox"');
  }
});
