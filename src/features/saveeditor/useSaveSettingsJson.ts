// SPDX-License-Identifier: GPL-3.0-or-later
import { useSyncExternalStore } from "react";
import { readSaveSettings, subscribeSaveSettings } from "./settingsRepository";
let last = "";
function snapshot() {
  try {
    last = readSaveSettings()?.json ?? "";
  } catch {
    /* Preserve the last known policy; the Worker reports invalid storage. */
  }
  return last;
}
export const useSaveSettingsJson = () =>
  useSyncExternalStore(subscribeSaveSettings, snapshot, () => "");

let lastRevision = "";
function revisionSnapshot() {
  try {
    lastRevision = readSaveSettings()?.revision ?? "";
  } catch {
    /* Keep the last known revision until settings storage is readable again. */
  }
  return lastRevision;
}
export const useSaveSettingsRevision = () =>
  useSyncExternalStore(subscribeSaveSettings, revisionSnapshot, () => "");
