// SPDX-License-Identifier: GPL-3.0-or-later
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SaveSettingsEditor } from "./SaveSettingsEditor";
import type { SaveSettingsBundle } from "./settingsProtocol";
describe("settings input metadata", () => {
  it("carries native numeric bounds to the HTML control and keeps pending values disabled", () => {
    const json = '{"legality":{"count":5,"pending":true}}';
    const bundle: SaveSettingsBundle = {
      apiVersion: 172,
      json,
      catalog: {
        groups: [
          {
            id: "legality",
            fields: [
              {
                path: "legality.count",
                name: "Count",
                kind: "integer",
                minimum: 1,
                maximum: 10,
                choices: [],
              },
              {
                path: "legality.pending",
                name: "Pending",
                kind: "boolean",
                minimum: null,
                maximum: null,
                choices: [],
              },
            ],
          },
        ],
      },
    };
    const html = renderToStaticMarkup(
      <SaveSettingsEditor
        bundle={bundle}
        json={json}
        lang="zh"
        busy={false}
        unavailable={{ "legality.pending": "尚待接入" }}
        onValidate={async (value) => value}
        onSave={async () => {}}
      />,
    );
    expect(html).toContain('type="number" min="1" max="10" step="1"');
    expect(html).toContain('type="checkbox" disabled=""');
    expect(html.match(/尚待接入/g)).toHaveLength(1);
    expect(html).toContain("aria-describedby=");
  });
});
