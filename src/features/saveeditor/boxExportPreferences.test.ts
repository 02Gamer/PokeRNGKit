// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import { rememberBoxExportPreferences } from "./boxExportPreferences";
import { parseBoxExportOptions } from "./boxExportOptions";
import { editingSettingsJson } from "./settingsPolicy";
import { boxArchiveRequest } from "./boxArchive";
import { readSaveSettings, replaceSaveSettings } from "./settingsRepository";
const defaults = () => ({
  startup: {
    language: "zh-Hans",
    version: "26.08.26",
    recentlyLoaded: ["preserve.sav"],
  },
  slotExport: {
    boxExport: parseBoxExportOptions(),
    defaultBoxExportNamer: "Default",
    allowBoxDataDrop: false,
    future: { keep: true },
  },
  report: { hiddenProperties: ["Secret"], extraProperties: ["PID"] },
});
const selected = {
  scope: 1,
  folderCreation: 1,
  folderPrefix: 2,
  emptySlots: 1,
  fileIndexPrefix: 3,
  notify: 1,
} as const;
it("forces the party view to all boxes and keeps notification metadata outside the Core request", () => {
  expect(boxArchiveRequest(0, selected).all).toBe(false);
  const request = boxArchiveRequest(-1, selected);
  expect(request).toEqual({
    box: -1,
    all: true,
    folderMode: 1,
    folderNaming: 2,
    emptySlots: 1,
    indexPrefix: 3,
  });
  expect(request).not.toHaveProperty("notify");
  expect(() =>
    boxArchiveRequest(0, { ...selected, notify: 2 as 0 | 1 }),
  ).toThrow();
});
function harness(existing = true) {
  let raw: string | null = null;
  const storage = {
    getItem: () => raw,
    setItem: (_key: string, value: string) => {
      raw = value;
    },
  };
  const base = JSON.stringify(defaults());
  const initial = existing
    ? replaceSaveSettings(base, undefined, storage, true)
    : undefined;
  const read = () => readSaveSettings(storage);
  const ports = {
    busy: vi.fn(() => false),
    read,
    defaults: vi.fn(() => base),
    validate: vi.fn(async (json: string) => json),
    write: vi.fn((json: string, revision: string | undefined) =>
      replaceSaveSettings(json, revision, storage),
    ),
  };
  const request = {
    options: selected,
    namer: "Default" as const,
    expectedRevision: initial?.revision,
  };
  return { ports, request, read, base, storage, initial };
}
it.each([true, false])(
  "stores validated complete settings and keeps editing policy stable (existing=%s)",
  async (existing) => {
    const h = harness(existing);
    const result = await rememberBoxExportPreferences(h.request, h.ports);
    const expected = defaults();
    expected.slotExport.boxExport = { ...selected };
    expect(JSON.parse(result.json)).toEqual(expected);
    expect(editingSettingsJson(result.json)).toBe(editingSettingsJson(h.base));
    expect(result.json).not.toBe(h.base); // Full request/frozen settings guards still see the change.
    expect(result.revision).not.toBe(h.initial?.revision);
    expect(result.databaseSettingsUnified).toBe(existing ? true : undefined);
    expect(h.ports.validate).toHaveBeenCalledOnce();
    expect(h.read()).toEqual(result);
  },
);
it("refuses a stale open panel before calling Core", async () => {
  const h = harness();
  const other = replaceSaveSettings(h.base, h.initial!.revision, h.storage);
  await expect(
    rememberBoxExportPreferences(h.request, h.ports),
  ).rejects.toThrow("another tab");
  expect(h.read()).toEqual(other);
  expect(h.ports.validate).not.toHaveBeenCalled();
});
it("preserves another tab's change made while validation is pending", async () => {
  const h = harness();
  let release!: (value: string) => void;
  h.ports.validate.mockImplementation(
    (json) =>
      new Promise((resolve) => {
        release = () => resolve(json);
      }),
  );
  const pending = rememberBoxExportPreferences(h.request, h.ports);
  const rejection = expect(pending).rejects.toThrow("another tab");
  const changed = defaults();
  changed.report.hiddenProperties = ["Other"];
  const other = replaceSaveSettings(
    JSON.stringify(changed),
    h.initial!.revision,
    h.storage,
  );
  release("");
  await rejection;
  expect(h.read()).toEqual(other);
});
it.each(["before", "after"])(
  "refuses active edits %s validation",
  async (phase) => {
    const h = harness();
    h.ports.busy.mockReturnValueOnce(phase === "before").mockReturnValue(true);
    await expect(
      rememberBoxExportPreferences(h.request, h.ports),
    ).rejects.toThrow("edit");
    expect(h.ports.write).not.toHaveBeenCalled();
    expect(h.read()).toEqual(h.initial);
  },
);
it.each(["core", "quota", "unrelated", "dropped", "namer"])(
  "preserves the previous snapshot on %s failure",
  async (failure) => {
    const h = harness();
    if (failure === "core")
      h.ports.validate.mockRejectedValue(new Error("Core rejected settings"));
    if (failure === "quota")
      h.ports.write.mockImplementation(() => {
        throw Error("quota");
      });
    if (["unrelated", "dropped", "namer"].includes(failure))
      h.ports.validate.mockImplementation(async (json) => {
        const root = JSON.parse(json);
        if (failure === "unrelated") root.startup.language = "en";
        if (failure === "dropped") delete root.slotExport.future;
        if (failure === "namer")
          root.slotExport.defaultBoxExportNamer = "Other";
        return JSON.stringify(root);
      });
    await expect(
      rememberBoxExportPreferences(h.request, h.ports),
    ).rejects.toThrow();
    expect(h.read()).toEqual(h.initial);
  },
);
it("rejects missing authoritative defaults and a Core result with altered requested options", async () => {
  const h = harness(false);
  h.ports.defaults.mockReturnValue("");
  await expect(
    rememberBoxExportPreferences(h.request, h.ports),
  ).rejects.toThrow("initialized");
  const other = harness();
  other.ports.validate.mockResolvedValue(other.base);
  await expect(
    rememberBoxExportPreferences(other.request, other.ports),
  ).rejects.toThrow("preserved");
  expect(other.read()).toEqual(other.initial);
});
// Independent values transcribed from upstream BoxExportSettings.cs enums.
it.each([
  ["scope", 1],
  ["folderCreation", 1],
  ["folderPrefix", 2],
  ["emptySlots", 1],
  ["fileIndexPrefix", 3],
  ["notify", 1],
] as const)("enforces source integer bounds for %s", (key, maximum) => {
  for (const invalid of [
    -1,
    maximum + 1,
    0.5,
    "1",
    null,
    Number.NaN,
    Infinity,
  ]) {
    expect(() =>
      parseBoxExportOptions({ ...selected, [key]: invalid }),
    ).toThrow();
  }
  expect(
    parseBoxExportOptions({ ...selected, [key]: 0 })[
      key as keyof typeof selected
    ],
  ).toBe(0);
  expect(
    parseBoxExportOptions({ ...selected, [key]: maximum })[
      key as keyof typeof selected
    ],
  ).toBe(maximum);
});
