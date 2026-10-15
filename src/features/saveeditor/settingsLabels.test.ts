// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, it, expect } from "vitest";
import {
  settingsFieldName,
  settingsGroupName,
  settingsEnumName,
} from "./settingsLabels";
describe("source settings localization", () => {
  it("uses source page, field and enum labels in the active language", () => {
    expect(settingsGroupName("slotExport", "zh")).toBe("槽位导出");
    expect(settingsFieldName("setUpdateDex", "zh")).toBe("写入时更新图鉴");
    expect(
      settingsEnumName("SpriteBuilderPreference", "ForceArtwork", "zh"),
    ).toBe("强制使用插画图标");
    expect(settingsGroupName("startup", "ja")).not.toBe("startup");
  });
});
