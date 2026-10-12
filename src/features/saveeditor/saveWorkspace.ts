// SPDX-License-Identifier: GPL-3.0-or-later
export type PrimaryWorkspace = "rng" | "save";
export const SAVE_SECTION_GROUPS = {
  pokemon: ["pokemon", "registeredGroups", "pokedex", "inventory"],
  trainer: [
    "trainer",
    "trainer8",
    "trainer8a",
    "trainer8b",
    "trainerGG",
    "brTrainer4",
    "br4Gear",
    "records",
    "gameRecords3",
    "fashion9",
    "cgear5",
    "rtc",
    "paintings3",
  ],
  events: [
    "events",
    "gsBall2",
    "eventReset",
    "event9a",
    "roamer3",
    "roamer",
    "globalLink5",
    "dlc5",
    "link6",
    "ferry3",
    "honeyTree4",
  ],
  game: [
    "festivalPlaza",
    "mailbox",
    "chatter",
    "hall3",
    "hall1",
    "misc3",
    "secretBase3",
    "pokegear4",
    "pokeathlon4",
    "battlePass4",
    "battleVideo4",
    "geonet4",
    "misc4",
    "misc5",
    "medals5",
    "berryField6xy",
    "avenue5",
    "superTrain6",
    "secretBase6",
    "hall6",
    "zygarde7",
    "sevenstar9",
    "raid9",
    "donut9a",
    "raid8",
    "underground8b",
    "seal8b",
    "misc8b",
    "hall7",
    "unityTower5",
    "underground4",
    "joyful3",
    "frontier3",
    "decorations3",
    "opowers",
    "food",
  ],
  tools: ["batch", "files"],
} as const;
export type SaveSection =
  (typeof SAVE_SECTION_GROUPS)[keyof typeof SAVE_SECTION_GROUPS][number];
export interface SaveSectionItem {
  id: SaveSection;
  label: string;
  available: boolean;
}
export const saveWorkspaceWords = {
  zh: {
    primary: "工作区",
    rng: "乱数工具",
    save: "存档编辑",
    navigation: "存档功能",
    pokemon: "宝可梦与道具",
    trainer: "训练家与记录",
    events: "事件与配信",
    game: "游戏功能",
    tools: "批量与文件",
  },
  en: {
    primary: "Workspace",
    rng: "RNG Tools",
    save: "Save Editor",
    navigation: "Save tools",
    pokemon: "Pokémon & items",
    trainer: "Trainer & records",
    events: "Events & gifts",
    game: "Game tools",
    tools: "Batch & files",
  },
  ja: {
    primary: "ワークスペース",
    rng: "乱数ツール",
    save: "セーブ編集",
    navigation: "セーブ機能",
    pokemon: "ポケモン・道具",
    trainer: "トレーナー・記録",
    events: "イベント・配信",
    game: "ゲーム機能",
    tools: "一括・ファイル",
  },
};
export function groupSaveSections(items: readonly SaveSectionItem[]) {
  return Object.entries(SAVE_SECTION_GROUPS)
    .map(([id, sections]) => ({
      id: id as keyof typeof SAVE_SECTION_GROUPS,
      items: items.filter(
        (item) =>
          item.available && (sections as readonly string[]).includes(item.id),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
