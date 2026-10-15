// SPDX-License-Identifier: GPL-3.0-or-later
const key = "pokerngkit-mystery-gift-revision";
const listeners = new Set<(origin?: object) => void>();
export function publishMysteryGiftChange(revision: string, origin?: object) {
  // IndexedDB is authoritative. A full/disabled localStorage must not turn a
  // successful database transaction into an apparent failed write.
  try {
    localStorage.setItem(key, revision);
  } catch {
    /* Local listeners still run. */
  }
  for (const listener of listeners) listener(origin);
}
export function subscribeMysteryGiftChanges(
  listener: (origin?: object) => void,
) {
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
