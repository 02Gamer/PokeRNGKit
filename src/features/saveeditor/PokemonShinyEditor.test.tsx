// SPDX-License-Identifier: GPL-3.0-or-later
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { PokemonShinyEditor } from "./PokemonShinyEditor";
import { shinySymbol } from "./drawSettings";
import { saveEditorResources } from "./locales";
const policy = vi.hoisted(() => ({ json: "" }));
vi.mock("./useSaveSettingsJson", () => ({
  useSaveSettingsJson: () => policy.json,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => saveEditorResources.zh }),
}));
beforeEach(() => {
  policy.json = "";
});
it("selects the exact configured symbol for each Unicode mode, including an empty symbol", () => {
  expect(shinySymbol("")).toBe("☆");
  for (const unicode of [true, false])
    expect(
      shinySymbol(
        JSON.stringify({
          display: { unicode },
          draw: { shinyUnicode: "◆", shinyDefault: "+" },
        }),
      ),
    ).toBe(unicode ? "◆" : "+");
  expect(
    shinySymbol(
      '{"display":{"unicode":true},"draw":{"shinyUnicode":"","shinyDefault":"*"}}',
    ),
  ).toBe("");
  expect(() => shinySymbol('{"display":{"unicode":"true"}}')).toThrow();
  expect(() =>
    shinySymbol(
      JSON.stringify({
        display: { unicode: true },
        draw: { shinyUnicode: "x".repeat(32768), shinyDefault: "*" },
      }),
    ),
  ).toThrow();
});
it("keeps the localized operation label and renders custom text without markup execution", () => {
  policy.json = JSON.stringify({
    display: { unicode: true },
    draw: { shinyUnicode: "<img>", shinyDefault: "*" },
  });
  const html = renderToStaticMarkup(
    <PokemonShinyEditor
      position={{ box: 0, slot: 0 }}
      disabled={false}
      onApply={async () => {}}
    />,
  );
  expect(html).toContain("&lt;img&gt;");
  expect(html).toContain(saveEditorResources.zh.applyShiny);
  expect(html).toContain('aria-hidden="true" class="save-shiny-symbol"');
  expect(html).not.toContain("<img>");
});
