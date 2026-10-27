// SPDX-License-Identifier: GPL-3.0-or-later
import {
  parseBoxExportOptions,
  type BoxExportDefaults,
} from "./boxExportOptions";
import { editingSettingsJson } from "./settingsPolicy";
import type { SaveSettingsSnapshot } from "./settingsRepository";

export interface BoxExportPreferenceRequest {
  options: BoxExportDefaults;
  expectedRevision: string | undefined;
  namer: "Default";
}
export type RememberBoxExport = (
  request: BoxExportPreferenceRequest,
) => Promise<SaveSettingsSnapshot>;
export async function rememberBoxExportPreferences(
  request: BoxExportPreferenceRequest,
  ports: {
    busy(): boolean;
    read(): SaveSettingsSnapshot | undefined;
    defaults(): string;
    validate(json: string): Promise<string>;
    write(
      json: string,
      expectedRevision: string | undefined,
    ): SaveSettingsSnapshot;
  },
): Promise<SaveSettingsSnapshot> {
  if (ports.busy()) throw new Error("An edit is still running.");
  const options = parseBoxExportOptions(request.options);
  if (request.namer !== "Default") throw new Error("Invalid box export namer.");
  const saved = ports.read();
  if (saved?.revision !== request.expectedRevision)
    throw new Error(
      "Save settings changed in another tab. Reload before saving.",
    );
  const base = saved?.json ?? ports.defaults();
  if (!base) throw new Error("Save settings have not initialized.");
  const root = JSON.parse(base);
  if (
    !root?.slotExport ||
    typeof root.slotExport !== "object" ||
    Array.isArray(root.slotExport)
  )
    throw new Error("Missing box export settings.");
  root.slotExport.boxExport = { ...root.slotExport.boxExport, ...options };
  root.slotExport.defaultBoxExportNamer = request.namer;
  const json = await ports.validate(JSON.stringify(root));
  // Do not silently normalize, discard, or change any unrelated saved field.
  if (editingSettingsJson(json) !== editingSettingsJson(base))
    throw new Error(
      "Unrelated settings changed during export preference validation.",
    );
  const checked = JSON.parse(json);
  if (
    JSON.stringify(parseBoxExportOptions(checked.slotExport?.boxExport)) !==
      JSON.stringify(options) ||
    checked.slotExport.defaultBoxExportNamer !== request.namer
  )
    throw new Error("Box export preferences were not preserved by Core.");
  if (ports.busy())
    throw new Error("An edit started while validating settings.");
  return ports.write(json, request.expectedRevision);
}
