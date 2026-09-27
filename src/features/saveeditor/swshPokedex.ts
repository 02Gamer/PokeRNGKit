import type { LocalizedText } from "./domain";
export function dex8Number(
  text: string,
  maximum: number,
  original?: number,
): number {
  const value = Number(text);
  if (!/^\d{1,10}$/.test(text) || (value > maximum && value !== original))
    throw new Error("Pokedex choices are invalid.");
  return value;
}
export interface Dex8State {
  index: number;
  seen: boolean[][];
  languages: boolean[];
  caught: boolean;
  gigantamaxed: boolean;
  form: number;
  gender: number;
  displayGigantamax: boolean;
  displayShiny: boolean;
  battled: number;
  gigantamaxed1: boolean | null;
}
export interface Dex8Entry {
  state: Dex8State;
  species: number;
  region: number;
  number: number;
  primary: boolean;
  name: LocalizedText;
  formChoices: LocalizedText[];
}
export interface Dex8Catalog {
  canEdit: boolean;
  entries: Dex8Entry[];
}
export type Dex8Action =
  "give" | "clear" | "seen" | "caught" | "uncaught" | "complete" | "counts";
export type Dex8Edit =
  | { action: "entry"; entry: Dex8State }
  | { action: Dex8Action; index?: number; shiny?: boolean; battled?: number };
export const dex8Shiny = (action: Dex8Action) =>
  ["give", "seen", "caught", "complete"].includes(action);
export function validateDex8(state: Dex8State, entry: Dex8Entry): Dex8Edit {
  const old = entry.state;
  if (
    state.index !== old.index ||
    !Number.isInteger(state.index) ||
    state.index < 1 ||
    state.index > 821 ||
    state.seen.length !== 4 ||
    state.seen.some((r) => r.length !== 64) ||
    state.languages.length !== 9 ||
    [...state.seen, state.languages].some((r) =>
      r.some((v) => typeof v !== "boolean"),
    ) ||
    [
      state.caught,
      state.gigantamaxed,
      state.displayGigantamax,
      state.displayShiny,
    ].some((v) => typeof v !== "boolean") ||
    (state.gigantamaxed1 === null) !== (old.gigantamaxed1 === null) ||
    (state.gigantamaxed1 !== null && typeof state.gigantamaxed1 !== "boolean")
  )
    throw new Error("Pokedex choices are invalid.");
  for (const [value, prior, max] of [
    [state.form, old.form, 100],
    [state.gender, old.gender, 2],
    [state.battled, old.battled, 2147483647],
  ])
    if (
      !Number.isInteger(value) ||
      value < 0 ||
      (value !== prior && value > max)
    )
      throw new Error("Pokedex choices are invalid.");
  return {
    action: "entry",
    entry: {
      ...state,
      seen: state.seen.map((r) => [...r]),
      languages: [...state.languages],
    },
  };
}
export const swshDexLabels = {
  zh: {
    regions: ["伽勒尔", "铠岛", "冠之雪原"],
    primary: "主记录",
    duplicate: "扩展图鉴重复记录",
    caught: "已捕获",
    gmax: "已超极巨化",
    gmax1: "连击流已超极巨化",
    form: "显示形态编号",
    gender: "显示性别",
    displayGmax: "显示超极巨化",
    displayShiny: "显示闪光",
    battled: "战斗次数",
    give: "当前种类：补全主记录",
    clear: "三个图鉴：清除全部记录",
    counts: "全部主记录：设置战斗次数",
    note: "手动编辑只改选中的地区记录。批量登记、清除捕获和设置次数只改每种宝可梦的主记录；清除全部会清空三个图鉴。形态位可以独立编辑，含未使用位。显示编号 0–100，战斗次数 0–2147483647；未改动的范围外原值保留。所有操作可撤销。",
  },
  en: {
    regions: ["Galar", "Isle of Armor", "Crown Tundra"],
    primary: "Primary record",
    duplicate: "Duplicate regional record",
    caught: "Caught",
    gmax: "Gigantamaxed",
    gmax1: "Rapid Strike Gigantamaxed",
    form: "Displayed form number",
    gender: "Displayed gender",
    displayGmax: "Display Gigantamax",
    displayShiny: "Display shiny",
    battled: "Battled count",
    give: "Current species: complete primary record",
    clear: "All three dexes: clear every record",
    counts: "All primary records: set battled count",
    note: "Manual edits affect the selected regional record. Registration batches, caught clearing and count updates affect each species’ primary record. Clear all empties all three dexes. Form bits, including unused bits, are independent. Displayed form: 0–100; battled: 0–2147483647. Unchanged out-of-range original values are retained. Every operation can be undone.",
  },
  ja: {
    regions: ["ガラル", "ヨロイ島", "カンムリ雪原"],
    primary: "主記録",
    duplicate: "別図鑑の重複記録",
    caught: "捕獲済み",
    gmax: "キョダイマックス済み",
    gmax1: "れんげきのかたのキョダイマックス",
    form: "表示フォルム番号",
    gender: "表示する性別",
    displayGmax: "キョダイマックスを表示",
    displayShiny: "色違いを表示",
    battled: "戦った数",
    give: "現在の種類：主記録を完成",
    clear: "全３図鑑：全記録を消去",
    counts: "全主記録：戦った数を設定",
    note: "手動編集は選択した地域の記録を変更します。一括登録・捕獲消去・回数設定は各種類の主記録が対象です。全消去は３図鑑を空にします。未使用を含むフォルムビットは独立です。表示番号は 0–100、戦った数は 0–2147483647。未変更の範囲外の元の値を保持します。操作は元に戻せます。",
  },
};
