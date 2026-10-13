import { afterEach, expect, it, vi } from "vitest";
import { loadDatabaseOptions, saveDatabaseOptions } from "./databaseSettings";
afterEach(() => vi.unstubAllGlobals());
it("restores explicit source settings and ignores damaged/out of range stored data", () => {
  let value: string | null = null;
  vi.stubGlobal("localStorage", {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  });
  const options = {
    filterUnavailableSpecies: false,
    sort: 2 as const,
    gridRows: 20,
  };
  expect(saveDatabaseOptions(options)).toBe(true);
  expect(loadDatabaseOptions()).toEqual(options);
  for (const bad of [
    "not JSON",
    "null",
    JSON.stringify({ ...options, gridRows: 21 }),
    JSON.stringify({ ...options, sort: 3 }),
    JSON.stringify({ ...options, filterUnavailableSpecies: 1 }),
  ]) {
    value = bad;
    expect(loadDatabaseOptions()).toEqual({
      filterUnavailableSpecies: true,
      sort: 0,
      gridRows: 9,
    });
  }
});
it("keeps source defaults available when browser storage is restricted", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw Error("restricted");
    },
    setItem: () => {
      throw Error("restricted");
    },
  });
  expect(loadDatabaseOptions().gridRows).toBe(9);
  expect(saveDatabaseOptions(loadDatabaseOptions())).toBe(false);
});
