// SPDX-License-Identifier: GPL-3.0-or-later
export interface SaveDetectionChoice {
  type: number;
  subVersion: number;
  language: number;
  handler: string;
  fileName: string;
}
export interface SaveDetectionCatalog {
  apiVersion: number;
  types: {
    id: number;
    name: string;
    versions: { id: number; name: { zh: string; en: string; ja: string } }[];
  }[];
  languages: { id: number; name: { zh: string; en: string; ja: string } }[];
  handlers: string[];
}
const formatNames: Record<string, [string, string, string]> = {
  RBY: [
    "红／绿／蓝／黄",
    "Red / Green / Blue / Yellow",
    "赤・緑・青・ピカチュウ",
  ],
  GSC: ["金／银／水晶", "Gold / Silver / Crystal", "金・銀・クリスタル"],
  RS: ["红宝石／蓝宝石", "Ruby / Sapphire", "ルビー・サファイア"],
  Emerald: ["绿宝石", "Emerald", "エメラルド"],
  FRLG: ["火红／叶绿", "FireRed / LeafGreen", "ファイアレッド・リーフグリーン"],
  DP: ["钻石／珍珠", "Diamond / Pearl", "ダイヤモンド・パール"],
  Pt: ["白金", "Platinum", "プラチナ"],
  HGSS: [
    "心金／魂银",
    "HeartGold / SoulSilver",
    "ハートゴールド・ソウルシルバー",
  ],
  BW: ["黑／白", "Black / White", "ブラック・ホワイト"],
  B2W2: ["黑2／白2", "Black 2 / White 2", "ブラック2・ホワイト2"],
  XY: ["X／Y", "X / Y", "X・Y"],
  AO: [
    "欧米伽红宝石／阿尔法蓝宝石",
    "Omega Ruby / Alpha Sapphire",
    "オメガルビー・アルファサファイア",
  ],
  AODemo: [
    "欧米伽红宝石／阿尔法蓝宝石体验版",
    "Omega Ruby / Alpha Sapphire Demo",
    "オメガルビー・アルファサファイア体験版",
  ],
  SM: ["太阳／月亮", "Sun / Moon", "サン・ムーン"],
  USUM: [
    "究极之日／究极之月",
    "Ultra Sun / Ultra Moon",
    "ウルトラサン・ウルトラムーン",
  ],
  LGPE: [
    "Let's Go 皮卡丘／伊布",
    "Let's Go Pikachu / Eevee",
    "Let's Go ピカチュウ・イーブイ",
  ],
  SWSH: ["剑／盾", "Sword / Shield", "ソード・シールド"],
  BDSP: [
    "晶灿钻石／明亮珍珠",
    "Brilliant Diamond / Shining Pearl",
    "ブリリアントダイヤモンド・シャイニングパール",
  ],
  LA: ["传说 阿尔宙斯", "Legends: Arceus", "LEGENDS アルセウス"],
  SV: ["朱／紫", "Scarlet / Violet", "スカーレット・バイオレット"],
  ZA: ["传说 Z-A", "Legends: Z-A", "LEGENDS Z-A"],
  Colosseum: ["宝可梦竞技场", "Pokémon Colosseum", "ポケモンコロシアム"],
  XD: ["宝可梦 XD", "Pokémon XD", "ポケモンXD"],
  RSBox: ["宝可梦整理箱", "Pokémon Box", "ポケモンボックス"],
  BattleRevolution: [
    "宝可梦对战革命",
    "Pokémon Battle Revolution",
    "ポケモンバトルレボリューション",
  ],
  Ranch: ["大家的宝可梦牧场", "My Pokémon Ranch", "みんなのポケモン牧場"],
  Stadium1J: [
    "宝可梦竞技场（日版初作）",
    "Pokémon Stadium (Japanese original)",
    "ポケモンスタジアム",
  ],
  Stadium1: ["宝可梦竞技场1", "Pokémon Stadium 1", "ポケモンスタジアム2"],
  Stadium2: ["宝可梦竞技场2", "Pokémon Stadium 2", "ポケモンスタジアム金銀"],
  Bulk3: [
    "第三世代批量存储",
    "Generation III bulk storage",
    "第3世代一括ストレージ",
  ],
  Bulk4: [
    "第四世代批量存储",
    "Generation IV bulk storage",
    "第4世代一括ストレージ",
  ],
  Bulk7: ["宝可梦虚拟银行", "Pokémon Bank", "ポケモンバンク"],
};
export function saveFormatName(format: string, lang: "zh" | "en" | "ja") {
  return (
    formatNames[format]?.[lang === "zh" ? 0 : lang === "en" ? 1 : 2] ?? format
  );
}
export function saveHandlerName(handler: string, lang: "zh" | "en" | "ja") {
  if (handler === "Default")
    return { zh: "原始存档", en: "Raw save", ja: "通常のセーブ" }[lang];
  if (handler === "FooterRTC")
    return { zh: "含时钟尾部（RTC）", en: "RTC footer", ja: "RTCフッター付き" }[
      lang
    ];
  return handler;
}
export const saveDetectionWords = {
  zh: {
    title: "手动识别存档",
    type: "存档格式",
    version: "游戏版本",
    language: "存档语言",
    handler: "文件容器",
    file: "选择存档",
    open: "按所选格式打开",
    hint: "自动识别失败时，明确选择存档格式和容器。校验失败的文件仍不可编辑。",
    invalid: "无法加载存档识别选项。",
    openError:
      "无法按所选格式读取，请核对游戏版本、存档语言和文件容器。原文件未修改。",
  },
  en: {
    title: "Manual save recognition",
    type: "Save format",
    version: "Game version",
    language: "Save language",
    handler: "File container",
    file: "Choose save",
    open: "Open with selected format",
    hint: "When automatic recognition fails, select the save format and container. Invalid checksums still prevent editing.",
    invalid: "Could not load save recognition choices.",
    openError:
      "Could not read with this format. Check the game version, save language and container. The original file is unchanged.",
  },
  ja: {
    title: "セーブの手動識別",
    type: "セーブ形式",
    version: "ゲームバージョン",
    language: "セーブの言語",
    handler: "ファイルコンテナ",
    file: "セーブを選択",
    open: "選択した形式で開く",
    hint: "自動識別に失敗した場合は形式とコンテナを選択してください。チェックサムが無効なファイルは編集できません。",
    invalid: "セーブ識別の選択肢を読み込めませんでした。",
    openError:
      "選択した形式で読み込めません。ゲーム、言語、コンテナを確認してください。元のファイルは変更されていません。",
  },
};
