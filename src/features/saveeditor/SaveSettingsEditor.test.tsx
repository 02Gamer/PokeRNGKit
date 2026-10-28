// SPDX-License-Identifier: GPL-3.0-or-later
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SaveSettingsEditor } from "./SaveSettingsEditor";
import type { SaveSettingsBundle } from "./settingsProtocol";
describe("settings input metadata", () => {
  it("carries native numeric bounds to the HTML control and keeps pending values disabled", () => {
    const json = '{"legality":{"count":5,"pending":true}}';
    const bundle: SaveSettingsBundle = {
      apiVersion: 190,
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

describe("settings category navigation", () => {
  const json = JSON.stringify({
    legality: { check: true },
    startup: { showChangelogOnUpdate: true },
    localResources: { templatePath: "template" },
  });
  const bundle: SaveSettingsBundle = {
    apiVersion: 190,
    json,
    catalog: {
      groups: ["legality", "startup", "localResources"].map((id) => ({
        id,
        fields: [
          {
            path:
              id === "startup"
                ? "startup.showChangelogOnUpdate"
                : id === "localResources"
                  ? "localResources.templatePath"
                  : "legality.check",
            name: id === "localResources" ? "TemplatePath" : "Check",
            kind: id === "localResources" ? "text" : "boolean",
            minimum: null,
            maximum: null,
            choices: [],
          },
        ],
      })),
    },
  };

  it.each(["zh", "en", "ja"] as const)(
    "honors a settings shortcut instead of the initial category in %s",
    (lang) => {
      const html = renderToStaticMarkup(
        <SaveSettingsEditor
          bundle={bundle}
          json={json}
          lang={lang}
          busy={false}
          initialGroup="legality"
          group="localResources"
          onGroupChange={() => {}}
          onValidate={async (value) => value}
          onSave={async () => {}}
        />,
      );
      expect(html).toContain('value="template"');
      expect(html).not.toContain('type="checkbox"');
    },
  );

  it.each(["zh", "en", "ja"] as const)(
    "falls back to an available category when the requested and initial categories are absent in %s",
    (lang) => {
      const html = renderToStaticMarkup(
        <SaveSettingsEditor
          bundle={{
            ...bundle,
            catalog: { groups: [bundle.catalog.groups[2]] },
          }}
          json={json}
          lang={lang}
          busy={false}
          initialGroup="legality"
          group="futureCategory"
          onGroupChange={() => {}}
          onValidate={async (value) => value}
          onSave={async () => {}}
        />,
      );
      expect(html).toContain('value="template"');
      expect(html).not.toContain("futureCategory");
    },
  );
});
