// SPDX-License-Identifier: GPL-3.0-or-later
import { beforeEach, expect, it, vi } from "vitest";
import { saveFailureFeedback } from "./saveFailureFeedback";
import { playSaveSound } from "./saveSound";
vi.mock("./saveSound", () => ({ playSaveSound: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
it.each([Error("Invalid save"), "Checksum mismatch", undefined])(
  "reports a current ordinary failure without changing the error",
  (cause) => {
    saveFailureFeedback(cause, true);
    expect(playSaveSound).toHaveBeenCalledExactlyOnceWith("other", "hand");
  },
);
it.each(["API version mismatch: 172/173", "Request timed out"])(
  "uses the exception cue for %s",
  (message) => {
    saveFailureFeedback(Error(message), true);
    expect(playSaveSound).toHaveBeenCalledExactlyOnceWith(
      "other",
      "exclamation",
    );
  },
);
it("silences stale requests and explicit cancellation", () => {
  saveFailureFeedback(Error("old response"), false);
  const cancellation = new Error("cancelled");
  cancellation.name = "AbortError";
  saveFailureFeedback(cancellation, true);
  expect(playSaveSound).not.toHaveBeenCalled();
});
