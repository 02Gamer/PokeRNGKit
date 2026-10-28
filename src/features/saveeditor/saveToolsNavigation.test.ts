// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  createSaveToolsNavigation,
  reduceSaveToolsNavigation,
} from "./saveToolsNavigation";

describe("save tools session navigation", () => {
  it("does not initialize unvisited settings, files or templates", () => {
    expect(createSaveToolsNavigation()).toEqual({
      mode: "save",
      opened: { save: true, entity: false, template: false, settings: false },
      settingsGroup: "legality",
    });
  });

  it.each(["save", "entity", "template"] as const)(
    "retains the settings mount and selected category through %s navigation",
    (mode) => {
      let state = reduceSaveToolsNavigation(createSaveToolsNavigation(), {
        type: "open",
        mode: "settings",
      });
      state = reduceSaveToolsNavigation(state, {
        type: "settingsGroup",
        group: "slotExport",
      });
      const before = structuredClone(state);
      const away = reduceSaveToolsNavigation(state, { type: "open", mode });
      expect(away.mode).toBe(mode);
      expect(away.opened.settings).toBe(true);
      expect(away.settingsGroup).toBe("slotExport");
      const back = reduceSaveToolsNavigation(away, {
        type: "open",
        mode: "settings",
      });
      expect(back.mode).toBe("settings");
      expect(back.settingsGroup).toBe("slotExport");
      expect(back.opened[mode]).toBe(true);
      expect(state).toEqual(before);
    },
  );

  it("lets a named settings shortcut override the remembered category", () => {
    let state = reduceSaveToolsNavigation(createSaveToolsNavigation(), {
      type: "open",
      mode: "settings",
      settingsGroup: "startup",
    });
    expect(state.settingsGroup).toBe("startup");
    state = reduceSaveToolsNavigation(state, {
      type: "open",
      mode: "template",
    });
    state = reduceSaveToolsNavigation(state, {
      type: "open",
      mode: "settings",
      settingsGroup: "localResources",
    });
    expect(state.settingsGroup).toBe("localResources");
    expect(state.opened.template).toBe(true);
    expect(state.opened.settings).toBe(true);
  });

  it("does not discard any visited workspace when a category changes", () => {
    let state = createSaveToolsNavigation();
    for (const mode of ["entity", "template", "settings"] as const)
      state = reduceSaveToolsNavigation(state, { type: "open", mode });
    state = reduceSaveToolsNavigation(state, {
      type: "settingsGroup",
      group: "hover",
    });
    expect(state.opened).toEqual({
      save: true,
      entity: true,
      template: true,
      settings: true,
    });
    expect(state.mode).toBe("settings");
    expect(state.settingsGroup).toBe("hover");
  });
});
