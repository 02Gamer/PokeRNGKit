// SPDX-License-Identifier: GPL-3.0-or-later
import type { PokemonEntry, PokemonLegalityReport } from "./domain";
import { moveBoxView } from "./boxViewer";

export interface RegisteredGroupPosition {
  group: number;
  slot: number;
}
export interface RegisteredGroupSlot {
  slot: number;
  pokemon: PokemonEntry | null;
  legality: "valid" | "invalid" | "unparsed" | null;
}
export interface RegisteredGroupEntry {
  index: number;
  name: string;
  storage: string;
  slots: RegisteredGroupSlot[];
}
export interface RegisteredGroupCatalog {
  initialGroup: number;
  groups: RegisteredGroupEntry[];
}
export interface RegisteredGroupAnalysis {
  position: RegisteredGroupPosition;
  report: PokemonLegalityReport;
}

export function groupPosition(
  catalog: RegisteredGroupCatalog,
  group: number,
  slot: number,
): RegisteredGroupPosition {
  const entry = catalog.groups.find((entry) => entry.index === group);
  if (
    !Number.isInteger(group) ||
    !Number.isInteger(slot) ||
    !entry?.slots.some((entry) => entry.slot === slot)
  )
    throw Error("Invalid registered team position.");
  return { group, slot };
}
export function moveGroup(
  catalog: RegisteredGroupCatalog,
  group: number,
  direction: -1 | 1,
  control = false,
) {
  const current = catalog.groups.findIndex((entry) => entry.index === group);
  const index = moveBoxView(current, catalog.groups.length, direction, control);
  return catalog.groups[index].index;
}
export const registeredGroupWords = {
  zh: {
    title: "注册队伍",
    group: "队伍",
    read: "读取注册队伍",
    previous: "上一队",
    next: "下一队",
    first: "首队",
    last: "末队",
    empty: "空格位",
    view: "查看详情",
    note: "注册队伍供查看与合法性分析，保留真实空格位。",
    unavailable: "当前存档没有注册队伍。",
  },
  en: {
    title: "Registered teams",
    group: "Team",
    read: "Read registered teams",
    previous: "Previous",
    next: "Next",
    first: "First",
    last: "Last",
    empty: "Empty slot",
    view: "View details",
    note: "View and analyze registered teams with their actual empty slots.",
    unavailable: "This save has no registered teams.",
  },
  ja: {
    title: "登録チーム",
    group: "チーム",
    read: "登録チームを読み込む",
    previous: "前のチーム",
    next: "次のチーム",
    first: "最初",
    last: "最後",
    empty: "空きスロット",
    view: "詳細を表示",
    note: "空きスロットを含む登録チームを表示して合法性を確認します。",
    unavailable: "このセーブに登録チームはありません。",
  },
} as const;
