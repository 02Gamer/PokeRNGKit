// SPDX-License-Identifier: GPL-3.0-or-later
export type SaveToolMode = "save" | "entity" | "template" | "settings";

export interface SaveToolsNavigation {
  mode: SaveToolMode;
  opened: Record<SaveToolMode, boolean>;
  settingsGroup: string;
}

export type SaveToolsNavigationAction =
  | { type: "open"; mode: SaveToolMode; settingsGroup?: string }
  | { type: "settingsGroup"; group: string };

export function createSaveToolsNavigation(): SaveToolsNavigation {
  return {
    mode: "save",
    opened: { save: true, entity: false, template: false, settings: false },
    settingsGroup: "legality",
  };
}

// Keep visited workspaces mounted and remember the category for this session,
// following SettingsEditor._last. Ordinary navigation must not reset it;
// explicit settings shortcuts may request a different category.
export function reduceSaveToolsNavigation(
  state: SaveToolsNavigation,
  action: SaveToolsNavigationAction,
): SaveToolsNavigation {
  if (action.type === "settingsGroup")
    return { ...state, settingsGroup: action.group };
  return {
    ...state,
    mode: action.mode,
    opened: { ...state.opened, [action.mode]: true },
    settingsGroup:
      action.mode === "settings"
        ? (action.settingsGroup ?? state.settingsGroup)
        : state.settingsGroup,
  };
}
