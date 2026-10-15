// SPDX-License-Identifier: GPL-3.0-or-later
let active = 0;
const listeners = new Set<() => void>();
const changed = () => {
  for (const listener of listeners) listener();
};
export const getSaveRequestCount = () => active;
export function subscribeSaveRequests(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function beginSaveRequest() {
  active++;
  changed();
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    active--;
    changed();
  };
}
