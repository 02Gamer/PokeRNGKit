// SPDX-License-Identifier: GPL-3.0-or-later
import type { LocalizedText } from "./domain";
export interface PersonalChartType {
  id: number;
  name: LocalizedText;
}
export interface PersonalChartRow {
  species: number;
  form: number;
  number: string;
  sprite: string;
  name: LocalizedText;
  native: boolean;
  bst: number;
  catchRate: number;
  type1: PersonalChartType;
  type2: PersonalChartType | null;
  stats: number[];
  statColors: string[];
  bstColor: string;
  abilityIds: number[];
  abilities: LocalizedText[];
  alphaMove: number | null;
  alphaMoveName: LocalizedText | null;
}
export interface PersonalChartCatalog {
  game: string;
  generation: number;
  hasAlphaMove: boolean;
  rows: PersonalChartRow[];
}
export const chartColumns = [
  "number",
  "sprite",
  "name",
  "native",
  "bst",
  "catchRate",
  "type1",
  "type2",
  "hp",
  "atk",
  "def",
  "spa",
  "spd",
  "spe",
  "ability0",
  "ability1",
  "abilityH",
] as const;
export type ChartColumn = (typeof chartColumns)[number] | "alphaMove";
export type ChartLanguage = "zh" | "en" | "ja";
export const chartWords = {
  zh: {
    title: "信息列表",
    columns: [
      "全国图鉴编号",
      "图标",
      "名称",
      "本世代原生",
      "种族值总和",
      "捕获率",
      "属性1",
      "属性2",
      "HP",
      "攻击",
      "防御",
      "特攻",
      "特防",
      "速度",
      "特性1",
      "特性2",
      "隐藏特性",
    ],
    alphaMove: "头目招式",
    search: "搜索名称、编号、属性或特性",
    loading: "正在读取信息列表…",
    failed: "信息列表读取失败",
    retry: "重新读取",
    empty: "没有匹配的记录",
    count: "条记录",
    yes: "是",
    no: "否",
    columnsLabel: "列顺序",
    left: "向左移动",
    right: "向右移动",
    reset: "恢复列顺序",
  },
  en: {
    title: "KChart",
    columns: [
      "Dex#",
      "Sprite",
      "Name",
      "Native",
      "BST",
      "Catch Rate",
      "Type1",
      "Type2",
      "HP",
      "ATK",
      "DEF",
      "SPA",
      "SPD",
      "SPE",
      "Ability 1",
      "Ability 2",
      "Hidden Ability",
    ],
    alphaMove: "Alpha Move",
    search: "Search name, number, type or ability",
    loading: "Reading KChart…",
    failed: "KChart could not be read",
    retry: "Read again",
    empty: "No matching records",
    count: "records",
    yes: "Yes",
    no: "No",
    columnsLabel: "Column order",
    left: "Move left",
    right: "Move right",
    reset: "Reset column order",
  },
  ja: {
    title: "KChart",
    columns: [
      "Dex#",
      "スプライト",
      "名前",
      "元データ",
      "合計",
      "被捕獲度",
      "タイプ1",
      "タイプ2",
      "HP",
      "攻撃",
      "防御",
      "特攻",
      "特防",
      "素早さ",
      "特性1",
      "特性2",
      "隠れ特性",
    ],
    alphaMove: "オヤブン技",
    search: "名前・番号・タイプ・特性を検索",
    loading: "情報を読み込み中…",
    failed: "情報を読み込めませんでした",
    retry: "再読み込み",
    empty: "一致する項目がありません",
    count: "件",
    yes: "はい",
    no: "いいえ",
    columnsLabel: "列の順序",
    left: "左へ移動",
    right: "右へ移動",
    reset: "列順を戻す",
  },
} as const;
export function chartValue(
  row: PersonalChartRow,
  column: ChartColumn,
  lang: ChartLanguage,
): string | number {
  const stat = ["hp", "atk", "def", "spa", "spd", "spe"].indexOf(column);
  if (stat >= 0) return row.stats[stat];
  const ability = ["ability0", "ability1", "abilityH"].indexOf(column);
  if (ability >= 0) return row.abilities[ability][lang];
  switch (column) {
    case "number":
      return row.number;
    case "sprite":
      return row.sprite;
    case "name":
      return row.name[lang];
    case "native":
      return Number(row.native);
    case "bst":
      return row.bst;
    case "catchRate":
      return row.catchRate;
    case "type1":
      return row.type1.name[lang];
    case "type2":
      return row.type2?.name[lang] ?? "";
    case "alphaMove":
      return row.alphaMoveName?.[lang] ?? "";
    default:
      return "";
  }
}
export function chartRows(
  rows: PersonalChartRow[],
  query: string,
  column: ChartColumn,
  descending: boolean,
  lang: ChartLanguage,
) {
  const needle = query.trim().toLocaleLowerCase();
  const collator = new Intl.Collator(lang, { numeric: false });
  return rows
    .filter(
      (row) =>
        !needle ||
        [
          row.number,
          String(row.species),
          row.name[lang],
          row.type1.name[lang],
          row.type2?.name[lang] ?? "",
          ...row.abilities.map((a) => a[lang]),
          row.alphaMoveName?.[lang] ?? "",
        ].some((value) => value.toLocaleLowerCase().includes(needle)),
    )
    .sort((a, b) => {
      const x = chartValue(a, column, lang),
        y = chartValue(b, column, lang);
      const comparison =
        typeof x === "number" && typeof y === "number"
          ? x - y
          : collator.compare(String(x), String(y));
      return (
        (descending ? -comparison : comparison) ||
        a.number.localeCompare(b.number)
      );
    });
}
export function moveChartColumn(
  order: ChartColumn[],
  column: ChartColumn,
  direction: -1 | 1,
) {
  const index = order.indexOf(column),
    target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return order;
  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
