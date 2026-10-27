// SPDX-License-Identifier: GPL-3.0-or-later
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SAVE_EDITOR_API_VERSION } from "./domain";
import { SaveSettingsEditor } from "./SaveSettingsEditor";
import { unavailableProgramSettings } from "./settingsAvailability";
import { settingsWords, settingsEnumName } from "./settingsLabels";
import type { SaveSettingsBundle, SaveSettingsField } from "./settingsProtocol";
import { resetSettingsDraft, type ObjectValue } from "./settingsDraft";

const field = (path: string, name: string): SaveSettingsField => ({
  path,
  name,
  kind: "text",
  minimum: null,
  maximum: null,
  choices: [],
});
const json = JSON.stringify({
  startup: {
    version: "26.08.26",
    recentlyLoaded: ["preserve.sav"],
    language: "zh-Hans",
    defaultSaveVersion: 3,
  },
  slotExport: { futureOption: "unchanged" },
});
const bundle: SaveSettingsBundle = {
  apiVersion: SAVE_EDITOR_API_VERSION,
  json,
  catalog: {
    groups: [
      {
        id: "startup",
        fields: [
          field("startup.version", "Version"),
          {
            ...field("startup.recentlyLoaded", "RecentlyLoaded"),
            kind: "list",
          },
          field("startup.language", "Language"),
          {
            ...field("startup.defaultSaveVersion", "DefaultSaveVersion"),
            kind: "enum",
            enumType: "GameVersion",
            choices: [{ value: 3, name: "E" }],
          },
        ],
      },
      {
        id: "slotExport",
        fields: [field("slotExport.futureOption", "FutureOption")],
      },
    ],
  },
};

it("resets editable defaults while retaining hidden metadata and unavailable values", () => {
  const saved = JSON.parse(json) as ObjectValue;
  const defaults = JSON.parse(json);
  defaults.startup = {
    version: "",
    recentlyLoaded: [],
    language: "en",
    defaultSaveVersion: 52,
  };
  defaults.slotExport.futureOption = "default";
  const catalog = { ...bundle, json: JSON.stringify(defaults) };
  const next = resetSettingsDraft(catalog, saved, {
    "slotExport.futureOption": "pending",
  });
  expect(next).toEqual({
    startup: {
      version: "26.08.26",
      recentlyLoaded: ["preserve.sav"],
      language: "zh-Hans",
      defaultSaveVersion: 52,
    },
    slotExport: { futureOption: "unchanged" },
  });
  expect(JSON.stringify(saved)).toBe(json);
  expect(JSON.parse(catalog.json)).toEqual(defaults);
});

it.each([
  ["zh", "空白存档版本："],
  ["en", "Blank Save Version:"],
  ["ja", "Blank セーブの種類:"],
] as const)(
  "uses the dedicated upstream blank-save label and hides automatic startup fields in %s",
  (lang, caption) => {
    const unavailable = unavailableProgramSettings(
      bundle.catalog,
      settingsWords[lang].pending,
      lang,
    );
    const html = renderToStaticMarkup(
      <SaveSettingsEditor
        bundle={bundle}
        json={json}
        lang={lang}
        busy={false}
        initialGroup="startup"
        unavailable={unavailable}
        onValidate={async (value) => value}
        onSave={async () => {}}
      />,
    );
    expect(html).toContain(caption);
    expect(html).not.toContain("DefaultSaveVersion");
    expect(html).not.toContain("preserve.sav");
    expect(html).not.toContain("26.08.26");
    expect(html).not.toContain("zh-Hans");
    expect(html).not.toContain(settingsWords[lang].pending);
    expect(html).toContain(settingsEnumName("GameVersion", "E", lang));
    expect(html.match(/aria-haspopup="listbox"/g)).toHaveLength(2);
    // Presentation filtering must leave the complete Core catalog and JSON intact.
    expect(bundle.catalog.groups[0].fields).toHaveLength(4);
    expect(bundle.json).toBe(json);
  },
);

it.each(["zh", "en", "ja"] as const)(
  "keeps SlotExport and unknown future settings visible and pending in %s",
  (lang) => {
    const unavailable = unavailableProgramSettings(
      bundle.catalog,
      settingsWords[lang].pending,
      lang,
    );
    const html = renderToStaticMarkup(
      <SaveSettingsEditor
        bundle={bundle}
        json={json}
        lang={lang}
        busy={false}
        initialGroup="slotExport"
        unavailable={unavailable}
        onValidate={async (value) => value}
        onSave={async () => {}}
      />,
    );
    expect(html).toContain("FutureOption");
    expect(html).toContain("unchanged");
    const pending = renderToStaticMarkup(
      <span>{settingsWords[lang].pending}</span>,
    ).slice(6, -7);
    expect(html).toContain(pending);
    expect(html).toContain("disabled");
  },
);
