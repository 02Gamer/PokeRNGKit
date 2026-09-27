import { expect, it } from "vitest";
import { boxFlags } from "./boxLayout";
const options = {
  canName: true,
  nameLength: 8,
  wallpapers: [],
  unlocked: 0,
  flags: [0],
  flagMaximum: 255,
  canSwap: true,
};
it("parses hexadecimal flags without treating empty values as zero", () => {
  expect(boxFlags(["FF"], options)).toEqual([255]);
  expect(boxFlags(["a0"], options)).toEqual([160]);
  for (const value of ["", " ", "0x1", "100", "-1", "GG", "1.5"])
    expect(() => boxFlags([value], options)).toThrow();
});
it("matches flag count and boolean-backed flag bounds", () => {
  expect(boxFlags([], { ...options, flags: [] })).toEqual([]);
  expect(() => boxFlags([], options)).toThrow();
  expect(() => boxFlags(["00", "01"], options)).toThrow();
  expect(boxFlags(["01"], { ...options, flagMaximum: 1 })).toEqual([1]);
  expect(() => boxFlags(["02"], { ...options, flagMaximum: 1 })).toThrow();
});
