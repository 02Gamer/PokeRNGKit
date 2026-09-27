import { describe, expect, it, vi } from "vitest";
import {
  FILE_BATCH_LIMITS,
  fileBatchHasErrors,
  readBatchFiles,
  validateBatchFiles,
  type FileBatchTicket,
} from "./fileBatch";

describe("file batch browser input", () => {
  it("preserves selected relative paths and binary bytes", async () => {
    const file = new File([new Uint8Array([0, 1, 128, 255])], "same.pk6");
    Object.defineProperty(file, "webkitRelativePath", {
      value: "folder/同名/same.pk6",
    });
    expect(await readBatchFiles([file], () => true)).toEqual([
      {
        path: "folder/同名/same.pk6",
        data: Buffer.from([0, 1, 128, 255]).toString("base64"),
      },
    ]);
  });
  it("checks aggregate limits before reading any file", async () => {
    const file = new File([], "a.pk6");
    const read = vi.spyOn(file, "arrayBuffer");
    Object.defineProperty(file, "size", { value: FILE_BATCH_LIMITS.bytes + 1 });
    await expect(readBatchFiles([file], () => true)).rejects.toThrow(
      "preview limits",
    );
    expect(read).not.toHaveBeenCalled();
    expect(() => validateBatchFiles([])).toThrow();
    expect(() =>
      validateBatchFiles(Array(FILE_BATCH_LIMITS.files + 1).fill(file)),
    ).toThrow();
  });
  it("stops after cancellation without reading the next file", async () => {
    let current = true;
    const first = new File([], "first.pk6"),
      second = new File([], "second.pk6");
    vi.spyOn(first, "arrayBuffer").mockImplementation(async () => {
      current = false;
      return new ArrayBuffer(0);
    });
    const next = vi.spyOn(second, "arrayBuffer");
    expect(
      await readBatchFiles([first, second], () => current),
    ).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });
  it("keeps multi-chunk binary data unchanged", async () => {
    const data = Uint8Array.from({ length: 20001 }, (_, i) => i & 255);
    const result = await readBatchFiles(
      [new File([data], "data.pk6")],
      () => true,
    );
    expect(result?.[0].data).toBe(Buffer.from(data).toString("base64"));
  });
  it("requires error confirmation for file errors and partial instructions", () => {
    const ticket: FileBatchTicket = {
      token: "file:1",
      summary: {
        groups: 1,
        filters: 0,
        instructions: 1,
        exportedFiles: 1,
        ignoredLines: [],
        emptyValues: false,
        files: [
          {
            path: "a.pk6",
            format: "PK6",
            status: "exported",
            inputSize: 232,
            outputSize: 260,
            outcomes: [{ group: 0, result: "modified", error: false }],
          },
        ],
      },
    };
    expect(fileBatchHasErrors(ticket)).toBe(false);
    for (const status of [
      "unrecognized",
      "formatConflict",
      "invalid",
      "exportFailed",
    ]) {
      ticket.summary.files[0].status = status;
      expect(fileBatchHasErrors(ticket)).toBe(true);
    }
    ticket.summary.files[0].status = "exported";
    ticket.summary.files[0].outcomes[0].error = true;
    expect(fileBatchHasErrors(ticket)).toBe(true);
  });
});
