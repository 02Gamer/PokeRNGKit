// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { copyGoParkSummary } from "./goParkSummary";
it("preserves the existing clipboard when there are no GO Park entries", async () => {
  const write = vi.fn(async () => {});
  expect(await copyGoParkSummary("", write)).toBe("empty");
  expect(write).not.toHaveBeenCalled();
  // An empty park does not need browser clipboard support or permission.
  expect(await copyGoParkSummary("")).toBe("empty");
});
it("copies the exact localized summary once", async () => {
  const text = "区域 1 · 皮卡丘\nエリア 2 · イーブイ";
  const write = vi.fn(async () => {});
  expect(await copyGoParkSummary(text, write)).toBe("copied");
  expect(write).toHaveBeenCalledExactlyOnceWith(text);
});
it("reports clipboard refusal without claiming success", async () => {
  expect(
    await copyGoParkSummary("Pikachu", async () => {
      throw new Error("Clipboard permission denied");
    }),
  ).toBe("failed");
});
it("waits for the browser write to finish before reporting success", async () => {
  let complete!: () => void;
  const result = copyGoParkSummary(
    "Pikachu",
    () => new Promise<void>((resolve) => (complete = resolve)),
  );
  const done = vi.fn();
  void result.then(done);
  await Promise.resolve();
  expect(done).not.toHaveBeenCalled();
  complete();
  expect(await result).toBe("copied");
});
