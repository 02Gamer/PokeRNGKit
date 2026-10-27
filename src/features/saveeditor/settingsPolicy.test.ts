// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, it, vi } from "vitest";
import {
  CoreSaveSettingsDefaults,
  editingSettingsJson,
} from "./settingsPolicy";
import { parseBoxExportOptions } from "./boxExportOptions";
const source = () => ({
  slotExport: {
    boxExport: { ...parseBoxExportOptions(), future: { value: 1 } },
    defaultBoxExportNamer: "Default",
    allowBoxDataDrop: true,
  },
  report: { extraProperties: ["PID"] },
});
it("ignores only verified export preferences, retaining future and unrelated policy fields", () => {
  const old = source(),
    changed = source();
  changed.slotExport.boxExport = {
    scope: 1,
    folderCreation: 1,
    folderPrefix: 2,
    emptySlots: 1,
    fileIndexPrefix: 3,
    notify: 1,
    future: { value: 1 },
  };
  changed.slotExport.defaultBoxExportNamer = "Imported desktop namer";
  const before = JSON.stringify(old),
    after = JSON.stringify(changed);
  expect(editingSettingsJson(after)).toBe(editingSettingsJson(before));
  changed.slotExport.boxExport.future.value = 2;
  expect(editingSettingsJson(JSON.stringify(changed))).not.toBe(
    editingSettingsJson(before),
  );
  changed.slotExport.boxExport.future.value = 1;
  changed.slotExport.allowBoxDataDrop = false;
  expect(editingSettingsJson(JSON.stringify(changed))).not.toBe(
    editingSettingsJson(before),
  );
  expect(JSON.stringify(old)).toBe(before);
});
it.each([
  "broken",
  "null",
  "[]",
  '{"slotExport":{"boxExport":null}}',
  '{"slotExport":{"boxExport":{"scope":9}}}',
])("does not mask invalid or unknown settings %s", (json) => {
  expect(editingSettingsJson(json)).toBe(json);
});
it("shares Core defaults without a storage write and keeps the first remembered preference policy stable", () => {
  const cache = new CoreSaveSettingsDefaults(),
    listener = vi.fn();
  const unsubscribe = cache.subscribe(listener),
    json = JSON.stringify(source());
  expect(cache.read()).toBe("");
  cache.remember(json);
  cache.remember(json);
  expect(listener).toHaveBeenCalledOnce();
  const saved = source();
  saved.slotExport.boxExport.notify = 1;
  expect(editingSettingsJson(JSON.stringify(saved))).toBe(
    editingSettingsJson(cache.read()),
  );
  expect(() => cache.remember("{}")).toThrow();
  expect(cache.read()).toBe(json);
  unsubscribe();
});
