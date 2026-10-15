// SPDX-License-Identifier: GPL-3.0-or-later
import type { SpriteData } from "./PokemonSprite";
export interface PokemonReportColumn {
  name: string;
  type: string;
  visible: boolean;
  sortable: boolean;
}
export interface PokemonReportRow {
  sprite: string;
  artwork?: SpriteData | null;
  source: "box" | "party" | "extra";
  box: number;
  slot: number;
  cells: string[];
}
export interface PokemonReportData {
  columns: PokemonReportColumn[];
  rows: PokemonReportRow[];
}
export interface PokemonReportCatalog {
  extra: string[];
  columns: string[];
}
export interface PokemonReportQuery {
  language: "zh-Hans" | "en" | "ja";
  extra: string[];
  hidden: string[];
  sortIndex: number | null;
  descending: boolean;
}
export interface PokemonReportActions {
  catalog(): Promise<PokemonReportCatalog | undefined>;
  read(query: PokemonReportQuery): Promise<PokemonReportData | undefined>;
  csv(query: PokemonReportQuery): Promise<string | undefined>;
}
export const reportWords = {
  zh: {
    title: "箱子数据报表",
    read: "读取报表",
    csv: "导出 CSV",
    extra: "额外属性",
    add: "添加",
    remove: "移除",
    columns: "显示列",
    restore: "恢复全部列",
    empty: "没有可显示的宝可梦",
    pending: "正在读取…",
    failed: "读取失败，请重试",
    rows: "条记录",
    ascending: "升序",
    descending: "降序",
    clipboard: "复制表格",
    markdown: "复制 Markdown",
    copied: "已复制",
    all: "包含箱子、队伍和额外存储槽",
    exported: "CSV 包含隐藏列",
    properties: "属性名",
    source: "来源",
  },
  en: {
    title: "Box Data Report",
    read: "Read report",
    csv: "Export CSV",
    extra: "Extra properties",
    add: "Add",
    remove: "Remove",
    columns: "Visible columns",
    restore: "Restore all columns",
    empty: "No Pokémon to display",
    pending: "Reading…",
    failed: "Reading failed. Try again.",
    rows: "rows",
    ascending: "Ascending",
    descending: "Descending",
    clipboard: "Copy table",
    markdown: "Copy Markdown",
    copied: "Copied",
    all: "Includes boxes, party and extra storage slots",
    exported: "CSV includes hidden columns",
    properties: "Property names",
    source: "Source",
  },
  ja: {
    title: "ボックスデータ一覧",
    read: "一覧を読み込む",
    csv: "CSV を出力",
    extra: "追加属性",
    add: "追加",
    remove: "削除",
    columns: "表示列",
    restore: "すべての列を表示",
    empty: "表示するポケモンがありません",
    pending: "読み込み中…",
    failed: "読み込みに失敗しました。再試行してください。",
    rows: "件",
    ascending: "昇順",
    descending: "降順",
    clipboard: "表をコピー",
    markdown: "Markdown をコピー",
    copied: "コピーしました",
    all: "ボックス、手持ちと追加保存枠を含む",
    exported: "CSV は非表示列も含む",
    properties: "属性名",
    source: "保存元",
  },
} as const;
// Core property identifiers remain unchanged in exported data and extra expressions.
const names: Record<string, readonly [string, string]> = {
  Sprite: ["图片", "画像"],
  Position: ["位置", "位置"],
  Nickname: ["昵称", "ニックネーム"],
  Species: ["种类", "種類"],
  Nature: ["性格", "性格"],
  Gender: ["性别", "性別"],
  ESV: ["蛋闪光值", "タマゴ色違い値"],
  HP_Type: ["觉醒力量属性", "めざめるパワータイプ"],
  Ability: ["特性", "特性"],
  HeldItem: ["持有物", "持ち物"],
  OT: ["训练家姓名", "親の名前"],
  NotOT: ["经手训练家姓名", "扱い主の名前"],
  OTLang: ["语言", "言語"],
  Version: ["来源游戏", "出身ソフト"],
  Legal: ["合法性", "合法性"],
  EncounterType: ["相遇类型", "出会いの種類"],
  Level: ["等级", "レベル"],
  EXP: ["经验值", "経験値"],
  MetLoc: ["相遇地点", "出会った場所"],
  EggLoc: ["蛋获得地点", "タマゴをもらった場所"],
  Ball: ["精灵球", "ボール"],
  Friendship: ["亲密度", "なつき度"],
  Form: ["形态", "フォルム"],
  IsEgg: ["蛋", "タマゴ"],
  IsShiny: ["异色", "色違い"],
  IsNicknamed: ["有昵称", "ニックネームあり"],
  FatefulEncounter: ["命运般的相遇", "運命的な出会い"],
  Checksum: ["校验值", "チェックサム"],
  GenderFlag: ["性别标记", "性別フラグ"],
  OriginalTrainerGender: ["训练家性别", "親の性別"],
  AbilityNum: ["特性槽", "特性枠"],
  MetLevel: ["相遇等级", "出会ったレベル"],
  PokerusStrain: ["宝可病毒种类", "ポケルスの種類"],
  PokerusDays: ["宝可病毒天数", "ポケルスの日数"],
  Cool: ["帅气", "かっこよさ"],
  Beauty: ["美丽", "うつくしさ"],
  Cute: ["可爱", "かわいさ"],
  Smart: ["聪明", "かしこさ"],
  Tough: ["强壮", "たくましさ"],
  Sheen: ["光泽", "けづや"],
};
const stats: Record<string, readonly [string, string]> = {
  HP: ["HP", "HP"],
  ATK: ["攻击", "攻撃"],
  DEF: ["防御", "防御"],
  SPA: ["特攻", "特攻"],
  SPD: ["特防", "特防"],
  SPE: ["速度", "素早さ"],
};
export function reportLabel(name: string, lang: "zh" | "en" | "ja"): string {
  if (lang === "en")
    return name === "OT"
      ? "Original trainer name"
      : name === "NotOT"
        ? "Handling trainer name"
        : name;
  const i = lang === "zh" ? 0 : 1;
  if (names[name]) return names[name][i];
  const date = /^(Egg|Met)(Year|Month|Day)$/.exec(name);
  if (date)
    return (
      (date[1] === "Egg"
        ? ["蛋获得", "タマゴをもらった"][i]
        : ["相遇", "出会った"][i]) +
      ({ Year: ["年", "年"], Month: ["月", "月"], Day: ["日", "日"] } as const)[
        date[2] as "Year" | "Month" | "Day"
      ][i]
    );
  const stat = /^(IV_|EV_)?(HP|ATK|DEF|SPA|SPD|SPE)$/.exec(name);
  if (stat)
    return (
      (stat[1] === "IV_"
        ? ["个体值 ", "個体値 "][i]
        : stat[1] === "EV_"
          ? ["努力值 ", "努力値 "][i]
          : "") + stats[stat[2]][i]
    );
  const move = /^(Move|Relearn)([1-4])(_PP|_PPUp)?$/.exec(name);
  if (move)
    return (
      (move[1] === "Relearn"
        ? ["回忆招式 ", "思い出し技 "][i]
        : ["招式 ", "技 "][i]) +
      move[2] +
      (move[3] === "_PPUp"
        ? [" PP 提升", " PPアップ"][i]
        : move[3] === "_PP"
          ? " PP"
          : "")
    );
  return name;
}
export function reportTable(
  report: PokemonReportData,
  lang: "zh" | "en" | "ja",
  markdown = false,
  selection?: {
    startRow: number;
    endRow: number;
    startColumn: number;
    endColumn: number;
  },
) {
  const columns = report.columns
    .map((c, i) => ({ c, i }))
    .filter(
      ({ c, i }) =>
        i > 0 &&
        c.visible &&
        (!selection ||
          (i >= Math.min(selection.startColumn, selection.endColumn) &&
            i <= Math.max(selection.startColumn, selection.endColumn))),
    );
  const rows = [
    columns.map(({ c }) => reportLabel(c.name, lang)),
    ...report.rows
      .filter(
        (_, i) =>
          !selection ||
          (i >= Math.min(selection.startRow, selection.endRow) &&
            i <= Math.max(selection.startRow, selection.endRow)),
      )
      .map((r) => columns.map(({ i }) => r.cells[i - 1])),
  ];
  if (!markdown) return rows.map((r) => r.join("\t")).join("\r\n");
  const lines = rows.map((r) => r.join("|"));
  lines.splice(
    1,
    0,
    Array(columns.length + 1)
      .fill("|")
      .join(":--:"),
  );
  return lines.join("\r\n");
}
