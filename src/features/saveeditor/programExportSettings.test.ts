// SPDX-License-Identifier: GPL-3.0-or-later
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadBoxExportDefaults,
  loadReportSettings,
  reportHiddenIndices,
} from "./programExportSettings";
import { replaceSaveSettings } from "./settingsRepository";
afterEach(() => vi.unstubAllGlobals());
function save(json: object) {
  let value: string | null = null;
  const storage = {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
  vi.stubGlobal("localStorage", storage);
  replaceSaveSettings(JSON.stringify(json), undefined, storage);
}
describe("report and box export settings", () => {
  it("uses source defaults and projects all six export options without mutating saved data", () => {
    expect(loadBoxExportDefaults()).toEqual({
      scope: 0,
      folderCreation: 0,
      folderPrefix: 0,
      emptySlots: 0,
      fileIndexPrefix: 0,
      notify: 0,
    });
    const options = {
      scope: 1,
      folderCreation: 1,
      folderPrefix: 2,
      emptySlots: 1,
      fileIndexPrefix: 3,
      notify: 1,
    };
    save({ slotExport: { boxExport: options } });
    const first = loadBoxExportDefaults();
    first.folderPrefix = 0;
    expect(loadBoxExportDefaults()).toEqual(options);
  });
  it("projects report defaults independently and honors native column visibility by index", () => {
    save({
      report: {
        extraProperties: ["Species", "PID"],
        hiddenProperties: ["OT", "Sprite"],
      },
    });
    const settings = loadReportSettings();
    settings.extra.push("Other");
    expect(loadReportSettings()).toEqual({
      extra: ["Species", "PID"],
      hidden: ["OT", "Sprite"],
    });
    expect(
      reportHiddenIndices([
        { visible: false },
        { visible: true },
        { visible: false },
        { visible: true },
      ]),
    ).toEqual([0, 2]);
  });
  it("rejects unusable report lists and undefined export enums", () => {
    save({
      report: { extraProperties: ["x".repeat(129)], hiddenProperties: [] },
    });
    expect(() => loadReportSettings()).toThrow("report");
    vi.unstubAllGlobals();
    save({
      slotExport: {
        boxExport: {
          scope: 2,
          folderCreation: 0,
          folderPrefix: 0,
          emptySlots: 0,
          fileIndexPrefix: 0,
          notify: 0,
        },
      },
    });
    expect(() => loadBoxExportDefaults()).toThrow("export");
  });
});
