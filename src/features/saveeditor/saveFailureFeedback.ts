// SPDX-License-Identifier: GPL-3.0-or-later
import { playSaveSound } from "./saveSound";

/** Feedback only for the current request; cancellation is deliberately silent. */
export function saveFailureFeedback(cause: unknown, current: boolean) {
  if (!current || (cause instanceof Error && cause.name === "AbortError"))
    return;
  const message = cause instanceof Error ? cause.message : String(cause);
  playSaveSound(
    "other",
    /API version mismatch|timed out/i.test(message) ? "exclamation" : "hand",
  );
}
