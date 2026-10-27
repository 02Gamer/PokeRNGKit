// SPDX-License-Identifier: GPL-3.0-or-later
import { boxExportLimits, parseBoxExportOptions } from "./boxExportOptions";
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

// Reactive editing policy only. Clients and frozen confirmations still read
// the complete stored JSON and keep their existing strict settings guards.
export function editingSettingsJson(json: string): string {
  if (!json) return json;
  try {
    const root: unknown = JSON.parse(json);
    if (!object(root) || !object(root.slotExport)) return json;
    const slot = root.slotExport;
    if (slot.boxExport !== undefined) {
      parseBoxExportOptions(slot.boxExport);
      if (!object(slot.boxExport)) return json;
      for (const name of Object.keys(boxExportLimits)) slot.boxExport[name] = 0;
    }
    if (slot.defaultBoxExportNamer !== undefined) {
      if (
        typeof slot.defaultBoxExportNamer !== "string" ||
        slot.defaultBoxExportNamer.length > 32767
      )
        return json;
      slot.defaultBoxExportNamer = "Default";
    }
    return JSON.stringify(root);
  } catch {
    return json;
  }
}

// Cache authoritative Core defaults in memory, including before the first
// settings write. This avoids treating the first remembered export preference
// as an unrelated editing-policy change. No second preference store is added.
export class CoreSaveSettingsDefaults {
  private json = "";
  private listeners = new Set<() => void>();
  read = () => this.json;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  remember(json: string) {
    const root: unknown = JSON.parse(json);
    if (
      !object(root) ||
      !object(root.slotExport) ||
      !object(root.slotExport.boxExport)
    )
      throw new Error("Missing complete Core settings defaults.");
    parseBoxExportOptions(root.slotExport.boxExport);
    if (this.json === json) return;
    this.json = json;
    for (const listener of this.listeners) listener();
  }
}
export const coreSaveSettingsDefaults = new CoreSaveSettingsDefaults();
