import { describe, expect, it, vi } from "vitest";
import { profileLink, type SaveProfileControllers } from "./profileLink";
import { DEFAULT_THREE_DS_PROFILE_DRAFT } from "../3dsprofiles/domain";
import type { SaveReport } from "./domain";

const report = {
  generation: 7,
  format: "SAV7USUM",
  version: "US",
  tid: 12345,
  sid: 54321,
  checksumsValid: true,
  nationalDex: null,
} as SaveReport;

describe("save profile linking", () => {
  it("updates identity while preserving calibrated seeds and flags", async () => {
    const original = {
      ...DEFAULT_THREE_DS_PROFILE_DRAFT,
      id: "calibrated",
      name: "Existing",
      version: "ultra-sun" as const,
      seeds: [1, 2, 3, 4] as [number, number, number, number],
      shinyCharm: true,
      timeTick: 777,
      timeOffset: 88,
      createdAt: 1,
      updatedAt: 2,
    };
    const updateProfile = vi.fn(async () => {});
    const selectProfile = vi.fn(async () => {});
    const controllers = {
      threeDs: {
        loading: false,
        profiles: [original],
        updateProfile,
        selectProfile,
      },
    } as unknown as SaveProfileControllers;
    const link = profileLink(report, "ultra-sun", controllers)!;
    await link.save("calibrated", "ignored");
    expect(updateProfile).toHaveBeenCalledWith(original, {
      ...original,
      tsv: (12345 ^ 54321) >>> 4,
      trv: (12345 ^ 54321) & 15,
    });
    expect(selectProfile).toHaveBeenCalledWith("calibrated");
  });
  it("rejects mismatched games and invalid checksums before storage access", () => {
    const controllers = {} as SaveProfileControllers;
    expect(profileLink(report, "ruby", controllers)).toBeUndefined();
    expect(
      profileLink(
        { ...report, checksumsValid: false },
        "ultra-sun",
        controllers,
      ),
    ).toBeUndefined();
  });
});
