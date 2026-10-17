// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SaveSettingsEditor } from "./SaveSettingsEditor";
import { unavailableProgramSettings } from "./settingsAvailability";
import { settingsWords, settingsFieldCaption } from "./settingsLabels";
import { SAVE_EDITOR_API_VERSION } from "./domain";
import type { SaveSettingsBundle } from "./settingsProtocol";
const field = (path: string, name: string) => ({
  path,
  name,
  kind: "boolean" as const,
  minimum: null,
  maximum: null,
  choices: [],
});
const catalog = {
  groups: [
    {
      id: "startup",
      fields: [
        field("startup.forceHaXOnLaunch", "ForceHaXOnLaunch"),
        field("startup.pluginLoadEnable", "PluginLoadEnable"),
      ],
    },
    {
      id: "display",
      fields: [
        field("display.unicode", "Unicode"),
        field("display.disableScalingDpi", "DisableScalingDpi"),
      ],
    },
    {
      id: "slotExport",
      fields: [field("slotExport.allowBoxDataDrop", "AllowBoxDataDrop")],
    },
    { id: "future", fields: [field("future.option", "Option")] },
  ],
};
it("exposes existing HaX and symbol consumers while unbound and unknown browser options stay disabled", () => {
  const unavailable = unavailableProgramSettings(catalog, "pending");
  expect(unavailable["startup.forceHaXOnLaunch"]).toBeUndefined();
  expect(unavailable["display.unicode"]).toBeUndefined();
  expect(Object.keys(unavailable).sort()).toEqual([
    "display.disableScalingDpi",
    "future.option",
    "slotExport.allowBoxDataDrop",
    "startup.pluginLoadEnable",
  ]);
});
it("enables the three bound Advanced consumers and keeps unknown settings unavailable", () => {
  const fields = [
    "advanced.saveExportCheckUnsavedEntity",
    "advanced.pathBlockKeyList",
    "advanced.hideEvent8Contains",
    "advanced.future",
  ].map((path) => field(path, path));
  expect(
    unavailableProgramSettings(
      { groups: [{ id: "advanced", fields }] },
      "pending",
    ),
  ).toEqual({ "advanced.future": "pending" });
});
it("places contextual tools in the actually selected settings group", () => {
  const props = {
    bundle: {
      apiVersion: SAVE_EDITOR_API_VERSION,
      json: "{}",
      catalog: {
        groups: [
          { id: "advanced", fields: [] },
          { id: "legality", fields: [] },
        ],
      },
    },
    json: "{}",
    lang: "zh" as const,
    busy: false,
    onValidate: async (json: string) => json,
    onSave: async () => {},
    renderGroupTools: (group: string) => <span>{`tools-for-${group}`}</span>,
  };
  const advanced = renderToStaticMarkup(
    <SaveSettingsEditor {...props} initialGroup="advanced" />,
  );
  expect(advanced).toContain("tools-for-advanced");
  expect(advanced).not.toContain("tools-for-legality");
  expect(
    renderToStaticMarkup(
      <SaveSettingsEditor {...props} initialGroup="legality" />,
    ),
  ).toContain("tools-for-legality");
});
it.each(["zh", "en", "ja"] as const)(
  "renders enabled, localized mode and symbol controls and preserves their saved values in %s",
  (lang) => {
    for (const enabled of [false, true]) {
      const json = JSON.stringify({
        startup: { forceHaXOnLaunch: enabled, pluginLoadEnable: true },
        display: { unicode: enabled, disableScalingDpi: false },
        slotExport: { allowBoxDataDrop: false },
        future: { option: false },
      });
      const bundle: SaveSettingsBundle = {
        apiVersion: SAVE_EDITOR_API_VERSION,
        json,
        catalog,
      };
      for (const group of ["startup", "display"] as const) {
        const props = {
          bundle,
          json,
          lang,
          busy: false,
          initialGroup: group,
          unavailable: unavailableProgramSettings(
            catalog,
            settingsWords[lang].pending,
          ),
          onValidate: async (value: string) => value,
          onSave: async () => {},
        };
        const html = renderToStaticMarkup(<SaveSettingsEditor {...props} />);
        const inputs = html.match(/<input[^>]*type="checkbox"[^>]*>/g)!;
        expect(inputs).toHaveLength(2);
        expect(inputs[0]).not.toContain('disabled=""');
        expect(inputs[0].includes('checked=""')).toBe(enabled);
        expect(inputs[1]).toContain('disabled=""');
        const f = catalog.groups.find((value) => value.id === group)!.fields[0];
        expect(html).toContain(settingsFieldCaption(f, lang));
        const locked = renderToStaticMarkup(
          <SaveSettingsEditor {...props} busy />,
        ).match(/<input[^>]*type="checkbox"[^>]*>/g)!;
        expect(locked.every((value) => value.includes('disabled=""'))).toBe(
          true,
        );
      }
    }
  },
);
