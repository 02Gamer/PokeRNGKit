import type { LocalizedText } from "./domain";
export interface Dex9Display {
  form: number;
  gender: number;
  shiny: boolean;
}
export interface Dex9State {
  species: number;
  status: number | null;
  isNew: boolean | null;
  different: boolean | null;
  genders: boolean[];
  shiny: boolean;
  languages: boolean[];
  forms: boolean[][];
  displays: Dex9Display[];
}
export interface Dex9Entry {
  state: Dex9State;
  name: LocalizedText;
  formChoices: LocalizedText[];
  regions: number[];
}
export interface Dex9Catalog {
  canEdit: boolean;
  modern: boolean;
  entries: Dex9Entry[];
}
export type Dex9Action =
  "give" | "clear" | "seen" | "caught" | "uncaught" | "complete";
export type Dex9Edit =
  | { action: "entry"; entry: Dex9State }
  | { action: Dex9Action; species?: number; shiny?: boolean };
export const dex9Shiny = (action: Dex9Action) =>
  ["give", "seen", "caught", "complete"].includes(action);
export function validateDex9(
  state: Dex9State,
  entry: Dex9Entry,
  modern: boolean,
): Dex9Edit {
  const old = entry.state,
    invalid = () => {
      throw new Error("Pokedex choices are invalid.");
    };
  if (
    state.species !== old.species ||
    !Number.isInteger(state.species) ||
    state.species < 1 ||
    state.species > 1025 ||
    state.genders.length !== 3 ||
    state.languages.length !== 9 ||
    state.forms.length !== (modern ? 4 : 1) ||
    state.forms.some((r) => r.length !== 32) ||
    [...state.forms, state.genders, state.languages].some((r) =>
      r.some((v) => typeof v !== "boolean"),
    ) ||
    typeof state.shiny !== "boolean" ||
    state.displays.length !== (modern ? 3 : 1)
  )
    invalid();
  if (modern) {
    if (
      state.status !== null ||
      state.isNew !== null ||
      state.different !== null
    )
      invalid();
  } else if (
    typeof state.isNew !== "boolean" ||
    typeof state.different !== "boolean" ||
    state.status === null ||
    !Number.isInteger(state.status) ||
    state.status < 0 ||
    state.status > 4294967295 ||
    (state.status !== old.status && state.status > 3)
  )
    invalid();
  state.displays.forEach((d, i) => {
    const prior = old.displays[i];
    if (
      typeof d.shiny !== "boolean" ||
      !Number.isInteger(d.form) ||
      !Number.isInteger(d.gender) ||
      d.form < 0 ||
      d.gender < 0 ||
      (d.form !== prior.form && d.form >= entry.formChoices.length) ||
      (d.gender !== prior.gender && d.gender > 2) ||
      (modern &&
        entry.regions[i] === 0 &&
        (d.form !== prior.form ||
          d.gender !== prior.gender ||
          d.shiny !== prior.shiny))
    )
      invalid();
  });
  return {
    action: "entry",
    entry: {
      ...state,
      genders: [...state.genders],
      languages: [...state.languages],
      forms: state.forms.map((r) => [...r]),
      displays: state.displays.map((d) => ({ ...d })),
    },
  };
}
export const svDexLabels = {
  zh: {
    regions: ["帕底亚", "北上乡", "蓝莓学园"],
    genders: ["雄性", "雌性", "无性别"],
    state: "状态",
    states: ["未登记", "听过", "见过", "已捕获"],
    isNew: "新",
    different: "性别差异",
    shiny: "异色",
    form: "显示形态",
    gender: "显示性别",
    columns: ["遇见", "捕获", "听过", "查看"],
    clear: "全图鉴：清除全部记录",
    unknown: "未命名形态位",
    note: "形态记录可独立编辑。补全会登记当前游戏中存在的形态；清除全部同时清空旧、新图鉴记录。所有操作可撤销。",
    oldNote:
      "旧版只有 32 个形态记录位。显示形态单独保存，霜奶仙的糖饰组合不代表额外的记录位。",
  },
  en: {
    regions: ["Paldea", "Kitakami", "Blueberry"],
    genders: ["Male", "Female", "Genderless"],
    state: "State",
    states: ["None", "Heard of", "Seen", "Captured"],
    isNew: "New",
    different: "Gender difference",
    shiny: "Shiny",
    form: "Displayed form",
    gender: "Displayed gender",
    columns: ["Seen", "Obtained", "Heard of", "Viewed"],
    clear: "All species: clear every record",
    unknown: "Unnamed form bit",
    note: "Form records are independent. Complete registers forms present in this game. Clear all empties both old and new Pokédex blocks. Every operation can be undone.",
    oldNote:
      "The original layout has 32 form bits. The displayed form is stored separately; Alcremie's sweet combinations do not add extra record bits.",
  },
  ja: {
    regions: ["パルデア", "キタカミ", "ブルーベリー"],
    genders: ["オス", "メス", "性別不明"],
    state: "状態",
    states: ["未登録", "聞いた", "見つけた", "捕獲済み"],
    isNew: "新規",
    different: "性別による違い",
    shiny: "色違い",
    form: "表示フォルム",
    gender: "表示する性別",
    columns: ["発見", "捕獲", "聞いた", "閲覧"],
    clear: "全種類：全記録を消去",
    unknown: "名称のないフォルムビット",
    note: "フォルム記録は独立して編集できます。補完はゲーム内に存在するフォルムを登録します。全消去は旧・新両方の図鑑記録を消去します。操作は元に戻せます。",
    oldNote:
      "旧形式のフォルム記録は32ビットです。表示フォルムは別に保存され、マホイップのアメざいくは追加の記録ビットではありません。",
  },
};
