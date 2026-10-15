// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from "vitest";
import {
  readSaveSettings,
  replaceSaveSettings,
  subscribeSaveSettings,
} from "./settingsRepository";
function store() {
  let value: string | null = null;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
}
describe("save settings snapshots", () => {
  it("notifies after a successful write and preserves the UI policy on failure", () => {
    const storage = store();
    let notifications = 0;
    const unsubscribe = subscribeSaveSettings(() => {
      expect(readSaveSettings(storage)).toBeDefined();
      notifications++;
    });
    try {
      const first = replaceSaveSettings("{}", undefined, storage);
      expect(notifications).toBe(1);
      expect(() =>
        replaceSaveSettings("{}", first.revision, {
          getItem: storage.getItem,
          setItem: () => {
            throw new Error("quota");
          },
        }),
      ).toThrow("quota");
      expect(notifications).toBe(1);
    } finally {
      unsubscribe();
    }
  });
  it("retains full normalized JSON and rejects stale tab updates", () => {
    const storage = store(),
      json = '{"legality":{"tradeback":{"allowGen1Tradeback":false}}}';
    const first = replaceSaveSettings(json, undefined, storage);
    expect(readSaveSettings(storage)).toEqual(first);
    const next = replaceSaveSettings(json, first.revision, storage);
    expect(() => replaceSaveSettings("{}", first.revision, storage)).toThrow(
      "another tab",
    );
    expect(readSaveSettings(storage)).toEqual(next);
  });
  it("keeps the old snapshot on storage failures and reports corrupt data", () => {
    const storage = store(),
      first = replaceSaveSettings("{}", undefined, storage);
    expect(() =>
      replaceSaveSettings("{}", first.revision, {
        getItem: storage.getItem,
        setItem: () => {
          throw new Error("quota");
        },
      }),
    ).toThrow("quota");
    expect(readSaveSettings(storage)).toEqual(first);
    storage.setItem("ignored", "broken");
    expect(() => readSaveSettings(storage)).toThrow();
    expect(storage.getItem()).toBe("broken");
  });
});
