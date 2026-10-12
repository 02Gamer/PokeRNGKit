// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it } from "vitest";
import {
  scblockRequest,
  scblockConfirmation,
  supportsSCBlock,
  scblockTopLevelFiles,
  type SCBlockPage,
  type SCBlockTicket,
} from "./scblock";
const page = {
  canEdit: true,
  format: "SAV9ZA",
  sourceHash: "A".repeat(64),
} as SCBlockPage;
it("keeps folder root files in order and excludes nested directories", () => {
  const files = [
    { webkitRelativePath: "root/b.bin" },
    { webkitRelativePath: "root/sub/a.bin" },
    { webkitRelativePath: "root/a.bin" },
  ];
  expect(scblockTopLevelFiles(files)).toEqual([files[0], files[2]]);
});
it("retains partial folder import order and independent raw payloads", () => {
  const files = [
    { fileName: "01020304 1.bin", data: "AA==" },
    { fileName: "01020304.bin", data: "AQ==" },
  ];
  const request = scblockRequest(page, [{ kind: "folder", files }]);
  files[0].data = "changed";
  expect(request.actions[0].files?.map((x) => x.data)).toEqual([
    "AA==",
    "AQ==",
  ]);
  expect(() =>
    scblockRequest(page, [
      { kind: "folder", files: [{ fileName: "sub/block.bin", data: "" }] },
    ]),
  ).toThrow();
});
it("requires the exact source and partial-import acknowledgement", () => {
  const ticket = {
    token: "scblock:1",
    sourceHash: page.sourceHash,
    targetHash: "B".repeat(64),
    requiresPartialAcceptance: true,
  } as SCBlockTicket;
  expect(() => scblockConfirmation(page, ticket, false)).toThrow();
  expect(scblockConfirmation(page, ticket, true).acceptPartialImport).toBe(
    true,
  );
  expect(() =>
    scblockConfirmation({ ...page, sourceHash: "C".repeat(64) }, ticket, true),
  ).toThrow();
});
it("rejects unsupported families and invalid Boolean types or keys", () => {
  expect(supportsSCBlock("SAV8BS")).toBe(false);
  expect(() => scblockRequest({ ...page, format: "SAV8BS" }, [])).toThrow();
  expect(() =>
    scblockRequest(page, [{ kind: "toggle", key: "123", type: "Bool2" }]),
  ).toThrow();
  expect(
    scblockRequest(page, [{ kind: "toggle", key: "FFFFFFFF", type: "Bool1" }])
      .actions,
  ).toHaveLength(1);
});
