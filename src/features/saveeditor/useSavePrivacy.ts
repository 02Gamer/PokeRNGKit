// SPDX-License-Identifier: GPL-3.0-or-later
import { useSyncExternalStore } from "react";
import { readSaveSettings, subscribeSaveSettings } from "./settingsRepository";

export type SavePrivacy = Readonly<{
  hideSAVDetails: boolean;
  hideSecretDetails: boolean;
}>;
const defaults: SavePrivacy = Object.freeze({
  hideSAVDetails: false,
  hideSecretDetails: false,
});
let current = defaults;
let currentJson: string | undefined;
export function decodeSavePrivacy(json: string): SavePrivacy {
  const value = (JSON.parse(json) as { privacy?: Partial<SavePrivacy> })
    .privacy;
  if (
    !value ||
    typeof value.hideSAVDetails !== "boolean" ||
    typeof value.hideSecretDetails !== "boolean"
  )
    throw new Error("Invalid privacy settings.");
  return Object.freeze({
    hideSAVDetails: value.hideSAVDetails,
    hideSecretDetails: value.hideSecretDetails,
  });
}
function snapshot(): SavePrivacy {
  try {
    const json = readSaveSettings()?.json;
    if (json !== currentJson) {
      const next = json ? decodeSavePrivacy(json) : defaults;
      currentJson = json;
      current = next;
    }
  } catch {
    // Keep the last known display policy when storage is corrupt or unavailable.
    // The Worker independently rejects invalid complete settings before edits.
  }
  return current;
}
export function useSavePrivacy(): SavePrivacy {
  return useSyncExternalStore(subscribeSaveSettings, snapshot, () => defaults);
}
