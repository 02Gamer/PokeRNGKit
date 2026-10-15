// SPDX-License-Identifier: GPL-3.0-or-later
const key = "pokerngkit-save-settings-v1";
const listeners = new Set<() => void>();
export function subscribeSaveSettings(listener: () => void) {
  listeners.add(listener);
  const changed = (event: StorageEvent) => {
    if (
      (event.key === key || event.key === null) &&
      event.storageArea === localStorage
    )
      listener();
  };
  if (typeof window !== "undefined")
    window.addEventListener("storage", changed);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined")
      window.removeEventListener("storage", changed);
  };
}
export interface SaveSettingsSnapshot {
  version: 1 | 2;
  revision: string;
  json: string;
  databaseSettingsUnified?: true;
}
type StoragePort = Pick<Storage, "getItem" | "setItem">;
function decode(raw: string | null): SaveSettingsSnapshot | undefined {
  if (raw === null) return undefined;
  const value = JSON.parse(raw) as Partial<SaveSettingsSnapshot>;
  if (
    (value.version !== 1 && value.version !== 2) ||
    typeof value.revision !== "string" ||
    !value.revision ||
    typeof value.json !== "string" ||
    !value.json ||
    value.json.length > 2 * 1024 * 1024 ||
    (value.databaseSettingsUnified !== undefined &&
      value.databaseSettingsUnified !== true) ||
    (value.version === 2 && value.databaseSettingsUnified !== true)
  )
    throw new Error(
      "Stored save settings are invalid. Preserve or reset them before continuing.",
    );
  return value as SaveSettingsSnapshot;
}
export function readSaveSettings(
  storage?: StoragePort,
): SaveSettingsSnapshot | undefined {
  if (!storage && typeof localStorage === "undefined") return undefined;
  return decode((storage ?? localStorage).getItem(key));
}
// The caller first validates and normalizes the complete JSON in Core. A quota
// failure or a stale revision must preserve the existing snapshot.
export function replaceSaveSettings(
  json: string,
  expectedRevision: string | undefined,
  storage: StoragePort = localStorage,
  unifyDatabaseSettings = false,
): SaveSettingsSnapshot {
  if (!json || json.length > 2 * 1024 * 1024)
    throw new Error("Settings request is too large or empty.");
  JSON.parse(json);
  const current = readSaveSettings(storage);
  if (current?.revision !== expectedRevision)
    throw new Error(
      "Save settings changed in another tab. Reload before saving.",
    );
  const next: SaveSettingsSnapshot = {
    version: unifyDatabaseSettings || current?.databaseSettingsUnified ? 2 : 1,
    revision: crypto.randomUUID(),
    json,
    ...(unifyDatabaseSettings || current?.databaseSettingsUnified
      ? { databaseSettingsUnified: true as const }
      : {}),
  };
  storage.setItem(key, JSON.stringify(next));
  for (const listener of listeners) listener();
  return next;
}
