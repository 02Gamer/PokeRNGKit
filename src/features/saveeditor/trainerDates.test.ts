import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Use separate processes so the timezone is real and cannot leak into another test.
function inTimezone(zone: string, statements: string) {
  const source = new URL("./trainerDates.ts", import.meta.url).href;
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { trainerDateValue, trainerDateWithOffset, trainerDateOffset, validateTrainerDates } from ${JSON.stringify(source)};
    const field = { key: "saved", value: "2024-11-03T06:30:00Z", kind: "utc", min: "2000-01-01T00:00:00", max: "2099-12-31T23:59:59" };
    ${statements}`,
      ],
      { encoding: "utf8", env: { ...process.env, TZ: zone } },
    ),
  );
}

describe("trainer timestamp timezone conversion", () => {
  it("converts BDSP UTC values using the browser timezone and serializes explicit offsets", () => {
    expect(
      inTimezone(
        "Asia/Shanghai",
        `console.log(JSON.stringify({
      display: trainerDateValue(field),
      offset: trainerDateWithOffset("2024-02-29T12:34:56"),
      edit: validateTrainerDates({ started: "", fame: "", saved: "2024-02-29T12:34" }, [field]),
      unchanged: validateTrainerDates({ started: "", fame: "", saved: trainerDateValue(field) }, [field]) ?? null,
    }));`,
      ),
    ).toEqual({
      display: "2024-11-03T14:30:00",
      offset: "2024-02-29T12:34:56+08:00",
      edit: { saved: "2024-02-29T12:34:00+08:00" },
      unchanged: null,
    });
  });
  it("rejects DST gaps and preserves an unchanged timestamp in the repeated hour", () => {
    expect(
      inTimezone(
        "America/New_York",
        `let rejected = false;
      try { validateTrainerDates({ started: "", fame: "", saved: "2024-03-10T02:30:00" }, [field]); } catch { rejected = true; }
      console.log(JSON.stringify({
        display: trainerDateValue(field),
        gap: trainerDateWithOffset("2024-03-10T02:30:00"),
        winter: trainerDateWithOffset("2024-01-01T12:00:00"),
        summer: trainerDateWithOffset("2024-07-01T12:00:00"),
        fold: trainerDateWithOffset("2024-11-03T01:30:00"),
        originalOffset: trainerDateOffset(field, "2024-11-03T01:30"),
        unchanged: validateTrainerDates({ started: "", fame: "", saved: "2024-11-03T01:30" }, [field]) ?? null,
        rejected,
      }));`,
      ),
    ).toEqual({
      display: "2024-11-03T01:30:00",
      gap: "",
      winter: "2024-01-01T12:00:00-05:00",
      summer: "2024-07-01T12:00:00-04:00",
      fold: "2024-11-03T01:30:00-04:00",
      originalOffset: "-05:00",
      unchanged: null,
      rejected: true,
    });
  });
  it("supports fractional-hour offsets and UTC without changing the selected local date", () => {
    for (const [zone, offset] of [
      ["Asia/Kathmandu", "+05:45"],
      ["UTC", "+00:00"],
      ["Pacific/Kiritimati", "+14:00"],
    ])
      expect(
        inTimezone(
          zone,
          `console.log(JSON.stringify(trainerDateWithOffset("2000-01-01T00:00:00")));`,
        ),
      ).toBe(`2000-01-01T00:00:00${offset}`);
  });
});
