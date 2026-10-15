import { expect, it, vi } from "vitest";
import { copyLegalityReport } from "./legalityClipboard";

it("copies the exact complete localized report without trimming", async () => {
  const write = vi.fn(async () => {});
  expect(await copyLegalityReport("中文\r\n日本語\n", () => true, write)).toBe(
    "copied",
  );
  expect(write).toHaveBeenCalledExactlyOnceWith("中文\r\n日本語\n");
});
it("does not start a stale clipboard request", async () => {
  const write = vi.fn(async () => {});
  expect(await copyLegalityReport("report", () => false, write)).toBe("stale");
  expect(write).not.toHaveBeenCalled();
});
it("reports a refused write only to the current view", async () => {
  expect(
    await copyLegalityReport(
      "report",
      () => true,
      async () => {
        throw new Error("denied");
      },
    ),
  ).toBe("failed");
});
it.each([false, true])(
  "ignores a late clipboard completion (rejected=%s)",
  async (reject) => {
    let current = true;
    let finish!: () => void;
    const pending = copyLegalityReport(
      "report",
      () => current,
      () =>
        new Promise<void>((resolve, fail) => {
          finish = () => (reject ? fail(new Error("late")) : resolve());
        }),
    );
    current = false;
    finish();
    expect(await pending).toBe("stale");
  },
);
