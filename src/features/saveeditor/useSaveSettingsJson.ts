// SPDX-License-Identifier: GPL-3.0-or-later
import { useSyncExternalStore } from "react";
import { readSaveSettings, subscribeSaveSettings } from "./settingsRepository";
import {
  coreSaveSettingsDefaults,
  editingSettingsJson,
} from "./settingsPolicy";
let last = "";
function snapshot() {
  try {
    last = editingSettingsJson(
      readSaveSettings()?.json ?? coreSaveSettingsDefaults.read(),
    );
  } catch {
    /* Preserve the last known policy; the Worker reports invalid storage. */
  }
  return last;
}
const subscribe = (listener: () => void) => {
  const saved = subscribeSaveSettings(listener);
  const defaults = coreSaveSettingsDefaults.subscribe(listener);
  return () => {
    saved();
    defaults();
  };
};
export const useSaveSettingsJson = () =>
  useSyncExternalStore(subscribe, snapshot, () => "");

// Consumers use this only as an editing-policy identity, never for storage CAS.
export const useSaveSettingsRevision = () =>
  useSyncExternalStore(subscribe, snapshot, () => "");
