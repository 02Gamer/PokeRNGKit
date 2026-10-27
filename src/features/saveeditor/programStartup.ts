// SPDX-License-Identifier: GPL-3.0-or-later
// PKHeX StartupSettings, Program.Main and StartupUtil.GetShowChangelog.
import { saveStartupWords } from "./saveStartupRelease";

// A request may fail after the UI language changes. Translate known startup
// messages again at render time while preserving unrelated error handling.
export function localizeSaveStartupError(
  error: string,
  lang: keyof typeof saveStartupWords,
): string | undefined {
  if (Object.values(saveStartupWords).some((words) => words.failed === error))
    return saveStartupWords[lang].failed;
  return undefined;
}

export interface SaveStartupPolicy {
  skipSplashScreen: boolean;
  showChangelogOnUpdate: boolean;
}
export function programStartupSettings(json: string): SaveStartupPolicy {
  const defaults = { skipSplashScreen: false, showChangelogOnUpdate: true };
  if (!json) return defaults;
  const root: unknown = JSON.parse(json);
  if (!root || typeof root !== "object" || Array.isArray(root))
    throw Error("Invalid save startup settings.");
  const startup = (root as Record<string, unknown>).startup;
  if (startup === undefined) return defaults;
  if (!startup || typeof startup !== "object" || Array.isArray(startup))
    throw Error("Invalid save startup settings.");
  for (const key of Object.keys(defaults) as (keyof SaveStartupPolicy)[]) {
    const value = (startup as Record<string, unknown>)[key];
    if (value !== undefined && typeof value !== "boolean")
      throw Error("Invalid save startup settings.");
    if (typeof value === "boolean") defaults[key] = value;
  }
  return defaults;
}

// Keep the Web launch history separate from imported desktop Startup.Version.
// Only canonical numeric versions written by this Web application are consumed.
export const SAVE_STARTUP_VERSION_KEY = "pokerngkit-save-startup-version-v1";
function versionParts(value: string): number[] | undefined {
  if (!/^\d+(?:\.\d+){1,3}$/.test(value)) return;
  const parts = value.split(".").map(Number);
  if (parts.some((part) => !Number.isSafeInteger(part) || part > 2147483647))
    return;
  return [...parts, ...Array<number>(4 - parts.length).fill(-1)];
}
export function showSaveChangelog(
  previous: string | null,
  current: string,
  enabled: boolean,
): boolean {
  const next = versionParts(current);
  if (!next) throw Error("Invalid current save tools version.");
  const last = previous === null ? undefined : versionParts(previous);
  if (!enabled || !last) return false;
  for (let index = 0; index < 4; index++) {
    if (last[index] !== next[index]) return last[index] < next[index];
  }
  return false;
}
export function recordSaveStartup(
  version: string,
  policy: SaveStartupPolicy,
  storage: Pick<Storage, "getItem" | "setItem">,
): { showChangelog: boolean; stored: boolean } {
  // Reject invalid release metadata before accessing or mutating storage.
  showSaveChangelog(null, version, false);
  let previous: string | null;
  try {
    previous = storage.getItem(SAVE_STARTUP_VERSION_KEY);
  } catch {
    return { showChangelog: false, stored: false };
  }
  const showChangelog = showSaveChangelog(
    previous,
    version,
    policy.showChangelogOnUpdate,
  );
  try {
    storage.setItem(SAVE_STARTUP_VERSION_KEY, version);
    return { showChangelog, stored: true };
  } catch {
    return { showChangelog, stored: false };
  }
}

// Serialize visibility changes and StrictMode setup/cleanup without replacing
// the save Worker's client, file, settings revision, or pending editor tickets.
export class SaveStartupSession {
  private queue: Promise<void> = Promise.resolve();
  private ready = false;
  run(
    active: () => boolean,
    initialize: () => Promise<boolean>,
  ): Promise<void> {
    const result = this.queue.then(async () => {
      if (!active() || this.ready) return;
      if (await initialize()) this.ready = true;
    });
    this.queue = result.catch(() => {});
    return result;
  }
}
