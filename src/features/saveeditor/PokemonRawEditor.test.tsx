// SPDX-License-Identifier: GPL-3.0-or-later
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PokemonRawEditor } from "./PokemonRawEditor";
import type { PokemonEntry } from "./domain";
import { saveEditorResources } from "./locales";
const policy = vi.hoisted(() => ({
  hideSecretDetails: false,
  hideSAVDetails: false,
}));
vi.mock("./useSavePrivacy", () => ({ useSavePrivacy: () => policy }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => saveEditorResources.zh }),
}));
describe("HOME tracker control and privacy", () => {
  const pokemon = {
    pid: 1,
    encryptionConstant: 2,
    canEditEncryptionConstant: true,
    homeTracker: "FEDCBA9876543210",
  } as PokemonEntry;
  it("renders an exact 16-character identifier only for supported entities", () => {
    policy.hideSecretDetails = false;
    const render = (p: PokemonEntry) =>
      renderToStaticMarkup(
        <PokemonRawEditor
          pokemon={p}
          disabled={false}
          onApply={async () => {}}
        />,
      );
    const html = render(pokemon);
    expect(html).toContain(saveEditorResources.zh.homeTrackerHex);
    expect(html).toContain('maxLength="16"');
    expect(html).toContain('value="FEDCBA9876543210"');
    expect(render({ ...pokemon, homeTracker: null })).not.toContain(
      saveEditorResources.zh.homeTrackerHex,
    );
  });
  it("hides HOME together with PID and encryption-constant editing", () => {
    policy.hideSecretDetails = true;
    try {
      expect(
        renderToStaticMarkup(
          <PokemonRawEditor
            pokemon={pokemon}
            disabled={false}
            onApply={async () => {}}
          />,
        ),
      ).toBe("");
    } finally {
      policy.hideSecretDetails = false;
    }
  });
});
