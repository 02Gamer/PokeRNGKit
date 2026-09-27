import { describe, expect, it } from "vitest";
import {
  spatialUnits,
  validateSpatialPosition,
  type TrainerSpatialField,
} from "./trainerSpatialPosition";

const fields: TrainerSpatialField[] = [
  {
    key: "map",
    value: "9007199254740993",
    min: "0",
    max: "18446744073709551615",
    places: 0,
    truncate: false,
  },
  {
    key: "x",
    value: "NaN",
    min: "-99999999",
    max: "99999999",
    places: 6,
    truncate: false,
  },
  {
    key: "y",
    value: "12",
    min: "-99999999",
    max: "99999999",
    places: 5,
    truncate: true,
  },
  {
    key: "rotation",
    value: "3",
    min: "-99999999",
    max: "99999999",
    places: 6,
    truncate: false,
  },
];
const draft = {
  map: "9007199254740993",
  x: "NaN",
  z: "",
  y: "12",
  rotation: "3",
  scaleX: "",
  scaleZ: "",
  scaleY: "",
};
describe("spatial position input", () => {
  it("keeps uint64 map IDs exact through validation", () => {
    expect(spatialUnits("18446744073709551615", 0)).toBe(18446744073709551615n);
    expect(
      validateSpatialPosition(
        { ...draft, map: "18446744073709551615" },
        fields,
      ),
    ).toEqual({ map: "18446744073709551615" });
    expect(
      validateSpatialPosition({ ...draft, map: "9007199254740992" }, fields),
    ).toEqual({ map: "9007199254740992" });
    expect(
      validateSpatialPosition({ ...draft, map: "09007199254740993" }, fields),
    ).toBeUndefined();
    for (const map of [
      "18446744073709551616",
      "-1",
      "1.0",
      "9e15",
      "",
      " 1",
      "+1",
    ])
      expect(() => validateSpatialPosition({ ...draft, map }, fields)).toThrow(
        /spatial position/,
      );
  });
  it("uses exact fixed-point bounds and rejects excess precision or unsupported fields", () => {
    expect(spatialUnits("-0.000001", 6)).toBe(-1n);
    expect(
      validateSpatialPosition(
        { ...draft, x: "-99999999.000000", y: "-1.23456" },
        fields,
      ),
    ).toEqual({ x: "-99999999.000000", y: "-1.23456" });
    for (const x of [
      "99999999.000001",
      "-99999999.000001",
      "1.0000001",
      ".1",
      "1.",
      "Infinity",
      "1e2",
      "1,2",
      "",
    ])
      expect(() => validateSpatialPosition({ ...draft, x }, fields)).toThrow(
        /spatial position/,
      );
    expect(() =>
      validateSpatialPosition({ ...draft, scaleX: "1" }, fields),
    ).toThrow(/spatial position/);
    expect(() =>
      validateSpatialPosition({ ...draft, rotation: "3" }, []),
    ).toThrow(/spatial position/);
  });
  it("preserves unusual originals and signed zero unless explicitly changed", () => {
    expect(validateSpatialPosition(draft, fields)).toBeUndefined();
    const unusual = fields.map((f) =>
      f.key === "x" ? { ...f, value: "-0" } : f,
    );
    expect(
      validateSpatialPosition({ ...draft, x: "0.000000" }, unusual),
    ).toBeUndefined();
    const outOfRange = fields.map((f) =>
      f.key === "x" ? { ...f, value: "100000000" } : f,
    );
    expect(
      validateSpatialPosition({ ...draft, x: "100000000.000000" }, outOfRange),
    ).toBeUndefined();
    expect(validateSpatialPosition({ ...draft, x: "2" }, fields)).toEqual({
      x: "2",
    });
  });
});
