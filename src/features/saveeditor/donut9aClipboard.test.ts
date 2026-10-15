// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { copyDonut9aHex, donut9aHexText } from "./donut9aClipboard";
it("copies all 72 original bytes in source order as uppercase spaced hex", async () => {
  const backing = new Uint8Array(80).fill(0xa5);
  const bytes = backing.subarray(4, 76);
  bytes.set([0x00, 0x01, 0x23, 0xab, 0xcd, 0xef]);
  bytes[71] = 0xff;
  const before = backing.slice();
  const text = donut9aHexText(bytes);
  expect(text.startsWith("00 01 23 AB CD EF ")).toBe(true);
  expect(text.endsWith("A5 FF")).toBe(true);
  expect(text).toMatch(/^[0-9A-F]{2}( [0-9A-F]{2}){71}$/);
  expect(text.split(" ").map((value) => Number.parseInt(value, 16))).toEqual([
    ...bytes,
  ]);
  const write = vi.fn(async () => {});
  await copyDonut9aHex(bytes, write);
  expect(write).toHaveBeenCalledExactlyOnceWith(text);
  expect(backing).toEqual(before);
});
it.each([0, 71, 73, 144])(
  "refuses incorrect export size %i before touching the clipboard",
  async (size) => {
    const write = vi.fn(async () => {});
    await expect(copyDonut9aHex(new Uint8Array(size), write)).rejects.toThrow(
      "size",
    );
    expect(write).not.toHaveBeenCalled();
  },
);
it("propagates clipboard refusal and preserves the source bytes", async () => {
  const bytes = new Uint8Array(72).fill(0xab),
    before = bytes.slice();
  await expect(
    copyDonut9aHex(bytes, async () => {
      throw new Error("denied");
    }),
  ).rejects.toThrow("denied");
  expect(bytes).toEqual(before);
});
it("does not report success until the clipboard write completes", async () => {
  let finish!: () => void;
  const task = copyDonut9aHex(
    new Uint8Array(72),
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const done = vi.fn();
  void task.then(done);
  await Promise.resolve();
  expect(done).not.toHaveBeenCalled();
  finish();
  await task;
  expect(done).toHaveBeenCalledOnce();
});
