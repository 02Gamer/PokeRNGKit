// SPDX-License-Identifier: GPL-3.0-or-later
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { PokemonSelect } from "./PokemonSelect";
import { invalidSelectionColor } from "./drawSettings";
const settings = vi.hoisted(() => ({ json: "" }));
vi.mock("./useSaveSettingsJson", () => ({
  useSaveSettingsJson: () => settings.json,
}));
beforeEach(() => {
  settings.json = "";
});
it("keeps an unknown raw identifier visible instead of presenting the first valid choice", () => {
  const html = renderToStaticMarkup(
    <PokemonSelect value={999}>
      <option value={0}>None</option>
      <option value={1}>First</option>
    </PokemonSelect>,
  );
  expect(html).toContain("<span>#999</span>");
  expect(html).toContain('aria-invalid="true"');
  expect(html).toContain("background-color:#e9967a");
  expect(html).toContain("color:#000000");
});
it("recognizes explicitly preserved and disabled source choices", () => {
  for (const option of [
    <option key="explicit" value="9" data-source-invalid>
      #9 · Unlisted
    </option>,
    <option key="disabled" value="9" disabled>
      Invalid
    </option>,
  ]) {
    const html = renderToStaticMarkup(
      <PokemonSelect value="9">
        {option}
        <option value="1">Valid</option>
      </PokemonSelect>,
    );
    expect(html).toContain('aria-invalid="true"');
  }
});
it.each([0, 37])(
  "resolves grouped valid and sparse value %s without invalid paint",
  (value) => {
    const html = renderToStaticMarkup(
      <PokemonSelect value={value} style={{ width: 120 }}>
        <optgroup label="Moves">
          <option value={value}>None</option>
        </optgroup>
      </PokemonSelect>,
    );
    expect(html).toContain("<span>None</span>");
    expect(html).not.toContain('aria-invalid="true"');
    expect(html).not.toContain("background-color");
    expect(html).toContain("width:120px");
  },
);
it("uses the saved source color while keeping layout and accessible labels", () => {
  settings.json = '{"draw":{"invalidSelection":"#123abc"}}';
  const html = renderToStaticMarkup(
    <PokemonSelect value="9" aria-label="Move" style={{ width: 120 }} disabled>
      <option value="0">None</option>
    </PokemonSelect>,
  );
  expect(html).toContain("background-color:#123abc");
  expect(html).toContain("width:120px");
  expect(html).toContain('aria-label="Move"');
  expect(html).toContain('disabled=""');
});
it("uses source defaults on missing settings but rejects malformed color settings", () => {
  expect(invalidSelectionColor("")).toBe("#e9967a");
  for (const json of [
    "{}",
    '{"draw":{"invalidSelection":"red"}}',
    '{"draw":{"invalidSelection":"#12345678"}}',
  ])
    expect(() => invalidSelectionColor(json)).toThrow();
});
