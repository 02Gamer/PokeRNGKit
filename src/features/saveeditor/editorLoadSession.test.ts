// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { EditorLoadSession } from "./editorLoadSession";
it("reuses one in-flight read across StrictMode cleanup and replay", async () => {
  const session = new EditorLoadSession();
  let finish!: (value: undefined) => void;
  const open = vi.fn(
    () =>
      new Promise<undefined>((resolve) => {
        finish = resolve;
      }),
  );
  const first = session.load(0, open),
    replayed = session.load(0, open);
  expect(first).toBe(replayed);
  expect(open).toHaveBeenCalledOnce();
  finish(undefined);
  await first;
  expect(session.load(0, open)).toBe(first);
  expect(open).toHaveBeenCalledOnce();
  const retry = session.load(1, open);
  expect(retry).not.toBe(first);
  expect(open).toHaveBeenCalledTimes(2);
  finish(undefined);
  await retry;
});
it("retains a failed read until explicit retry instead of looping when busy flags change", async () => {
  const session = new EditorLoadSession(),
    open = vi.fn(async () => {
      throw Error("failed");
    });
  const first = session.load(0, open);
  await expect(first).rejects.toThrow("failed");
  expect(session.load(0, open)).toBe(first);
  expect(open).toHaveBeenCalledOnce();
  await expect(session.load(1, open)).rejects.toThrow("failed");
  expect(open).toHaveBeenCalledTimes(2);
});
