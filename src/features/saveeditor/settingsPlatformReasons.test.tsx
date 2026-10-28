// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { unavailableProgramSettings } from "./settingsAvailability";
import { settingsPlatformReason } from "./settingsPlatformReasons";
import { settingsWords } from "./settingsLabels";
import { SaveSettingsEditor } from "./SaveSettingsEditor";
import type { SaveSettingsBundle, SaveSettingsField } from "./settingsProtocol";
import { SAVE_EDITOR_API_VERSION } from "./domain";

const paths = [
  "startup.darkMode",
  "startup.highDpiText",
  "startup.pluginLoadEnable",
  "startup.pluginLoadMerged",
  "localResources.pluginPath",
  "startup.tryDetectRecentSave",
  "backup.bakPrompt",
  "backup.otherSaveFileExtensions",
  "advanced.saveExportForceSaveAs",
  "slotExport.allowBoxDataDrop",
  "display.focusBorderDeflate",
  "display.disableScalingDpi",
] as const;
const enabled = [
  "startup.forceHaXOnLaunch",
  "display.unicode",
  "advanced.dragStartThreshold",
  "startup.showChangelogOnUpdate",
  "startup.skipSplashScreen",
];
const pending = ["advanced.future"];
const field = (path: string): SaveSettingsField => ({
  path,
  name: path.split(".").at(-1)!,
  kind:
    path === "localResources.pluginPath"
      ? "text"
      : path === "backup.otherSaveFileExtensions"
        ? "list"
        : path === "display.focusBorderDeflate" ||
            path === "advanced.dragStartThreshold"
          ? "integer"
          : path === "advanced.future"
            ? "enum"
            : "boolean",
  minimum: null,
  maximum: null,
  choices: path === "advanced.future" ? [{ value: 0, name: "Default" }] : [],
});
const groups = [
  "startup",
  "localResources",
  "backup",
  "advanced",
  "slotExport",
  "display",
].map((id) => ({
  id,
  fields: [...paths, ...enabled, ...pending]
    .filter((path) => path.startsWith(id + "."))
    .map(field),
}));
const catalog = { groups };
const values = Object.fromEntries(
  groups.map((group) => [
    group.id,
    Object.fromEntries(
      group.fields.map((entry, index) => [
        entry.path.split(".")[1],
        entry.kind === "text"
          ? "plugins"
          : entry.kind === "list"
            ? ["sav", "main"]
            : entry.kind === "integer"
              ? 3
              : entry.kind === "enum"
                ? 0
                : !!(index % 2),
      ]),
    ),
  ]),
);
const json = JSON.stringify(values);
const escaped = (value: string) =>
  renderToStaticMarkup(<span>{value}</span>).slice(6, -7);

it.each(["zh", "en", "ja"] as const)(
  "explains verified desktop or shared-shell behaviors without enabling options in %s",
  (lang) => {
    const missing = settingsWords[lang].pending;
    const unavailable = unavailableProgramSettings(catalog, missing, lang);
    expect(Object.keys(unavailable).sort()).toEqual(
      Object.keys(unavailableProgramSettings(catalog, missing)).sort(),
    );
    for (const path of paths) {
      expect(unavailable[path]).toBe(settingsPlatformReason(path, lang));
      expect(unavailable[path]).not.toBe(missing);
    }
    for (const path of enabled) expect(unavailable[path]).toBeUndefined();
    for (const path of pending) {
      expect(settingsPlatformReason(path, lang)).toBeUndefined();
      expect(unavailable[path]).toBe(missing);
    }
    const bundle: SaveSettingsBundle = {
      apiVersion: SAVE_EDITOR_API_VERSION,
      json,
      catalog,
    };
    for (const group of groups) {
      const html = renderToStaticMarkup(
        <SaveSettingsEditor
          bundle={bundle}
          json={json}
          lang={lang}
          busy={false}
          unavailable={unavailable}
          initialGroup={group.id}
          onValidate={async (draft) => draft}
          onSave={async () => {}}
        />,
      );
      const specific = [
        ...html.matchAll(/<small id="([^"]+)">([^<]*)<\/small>/g),
      ];
      expect(specific).toHaveLength(
        group.fields.filter((entry) =>
          paths.some((path) => path === entry.path),
        ).length,
      );
      expect(new Set(specific.map((match) => match[1])).size).toBe(
        specific.length,
      );
      for (const [, id, reason] of specific) {
        expect(html).toContain(`aria-describedby="${id}"`);
        const controls = [
          ...html.matchAll(/<(?:input|textarea|button)\b[^>]*>/g),
        ];
        expect(
          controls.some(
            ([tag]) =>
              tag.includes(`aria-describedby="${id}"`) &&
              tag.includes("disabled"),
          ),
        ).toBe(true);
        expect(
          group.fields.some((entry) => {
            const explanation = settingsPlatformReason(entry.path, lang);
            return explanation && escaped(explanation) === reason;
          }),
        ).toBe(true);
      }
      if (group.fields.some((entry) => pending.includes(entry.path))) {
        expect(html.split(escaped(missing))).toHaveLength(2);
      } else expect(html).not.toContain(escaped(missing));
    }
    expect(JSON.parse(json)).toEqual(values);
  },
);

it("keeps arbitrary future paths pending rather than inferring platform exclusion", () => {
  for (const path of [
    "future.desktopThing",
    "advanced.dragStartThresholdExtra",
    "localResources.pluginPathExtra",
    "battleTemplate.hover.statsCustom.future",
    "battleTemplate.export.statsCustom.minimumDigitsExtra",
  ]) {
    expect(settingsPlatformReason(path, "zh")).toBeUndefined();
    expect(
      unavailableProgramSettings(
        { groups: [{ id: "future", fields: [field(path)] }] },
        "pending",
        "zh",
      ),
    ).toEqual({ [path]: "pending" });
  }
});

// PKHeX 26.08.26 BattleTemplateTypeSetting declares StatsCustom, while
// GetSettings does not read it. Keep these exact source leaves unavailable.
it.each(["zh", "en", "ja"] as const)(
  "explains the source-inactive custom stat settings in %s",
  (lang) => {
    const format = {
      names: ["H", "A", "B", "C", "D", "S"],
      separator: " ",
      valueGap: ":",
      isLeft: true,
      alwaysShow: true,
      minimumDigits: 0,
    };
    const fields = (["hover", "export"] as const).flatMap((target) =>
      Object.entries(format).map(([name, value]): SaveSettingsField => ({
        path: `battleTemplate.${target}.statsCustom.${name}`,
        name,
        kind: Array.isArray(value)
          ? "list"
          : typeof value === "boolean"
            ? "boolean"
            : typeof value === "number"
              ? "integer"
              : "text",
        minimum: typeof value === "number" ? -2147483648 : null,
        maximum: typeof value === "number" ? 2147483647 : null,
        choices: [],
      })),
    );
    const value = {
      battleTemplate: {
        hover: { statsCustom: format },
        export: { statsCustom: format },
      },
    };
    const input = JSON.stringify(value);
    const catalog = { groups: [{ id: "battleTemplate", fields }] };
    const unavailable = unavailableProgramSettings(
      catalog,
      settingsWords[lang].pending,
      lang,
    );
    expect(Object.keys(unavailable)).toHaveLength(12);
    const phrase = {
      zh: "生成模板时没有读取",
      en: "not read when generating templates",
      ja: "テンプレート生成時には参照",
    };
    for (const entry of fields)
      expect(unavailable[entry.path]).toContain(phrase[lang]);
    const html = renderToStaticMarkup(
      <SaveSettingsEditor
        bundle={{ apiVersion: SAVE_EDITOR_API_VERSION, json: input, catalog }}
        json={input}
        lang={lang}
        busy={false}
        unavailable={unavailable}
        initialGroup="battleTemplate"
        onValidate={async (draft) => draft}
        onSave={async () => {}}
      />,
    );
    const reasons = [...html.matchAll(/<small id="([^"]+)">([^<]*)<\/small>/g)];
    expect(reasons).toHaveLength(12);
    expect(new Set(reasons.map((match) => match[1])).size).toBe(12);
    const controls = [...html.matchAll(/<(?:input|textarea|button)\b[^>]*>/g)];
    for (const [, id, reason] of reasons) {
      expect(reason).toContain(escaped(phrase[lang]));
      expect(
        controls.some(
          ([tag]) =>
            tag.includes(`aria-describedby="${id}"`) &&
            tag.includes("disabled"),
        ),
      ).toBe(true);
    }
    expect(html).not.toContain(escaped(settingsWords[lang].pending));
    expect(JSON.parse(input)).toEqual(value);
  },
);
