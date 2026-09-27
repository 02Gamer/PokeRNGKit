import type { LocalizedText } from "./domain";
export interface Dex8bState {
  species: number;
  state: number;
  genders: boolean[];
  languages: boolean[];
  forms: boolean[][];
}
export interface Dex8bEntry {
  state: Dex8bState;
  name: LocalizedText;
  formChoices: LocalizedText[];
}
export interface Dex8bCatalog {
  canEdit: boolean;
  national: boolean;
  entries: Dex8bEntry[];
}
export type Dex8bAction =
  | "give"
  | "giveNone"
  | "clear"
  | "seen"
  | "caught"
  | "uncaught"
  | "complete"
  | "formsClear"
  | "formsRegular"
  | "formsShiny";
export type Dex8bEdit =
  | { action: "entry"; entry: Dex8bState }
  | { action: "national"; national: boolean }
  | { action: Dex8bAction; species: number; shiny: boolean };
export const dex8bShiny = (action: Dex8bAction) =>
  action === "seen" || action === "complete";
export const dex8bSingle = (action: Dex8bAction) =>
  action === "give" || action === "giveNone" || action.startsWith("forms");
export function validateDex8b(state: Dex8bState, entry: Dex8bEntry): Dex8bEdit {
  if (
    state.species !== entry.state.species ||
    !Number.isInteger(state.species) ||
    state.species < 1 ||
    state.species > 493 ||
    !Number.isInteger(state.state) ||
    (state.state !== entry.state.state &&
      (state.state < 0 || state.state > 3)) ||
    state.genders.length !== 4 ||
    state.languages.length !== 9 ||
    state.forms.length !== 2 ||
    state.forms.some((r) => r.length !== entry.formChoices.length) ||
    [state.genders, state.languages, ...state.forms].some((a) =>
      a.some((v) => typeof v !== "boolean"),
    )
  )
    throw new Error("Pokedex choices are invalid.");
  return {
    action: "entry",
    entry: {
      ...state,
      genders: [...state.genders],
      languages: [...state.languages],
      forms: state.forms.map((r) => [...r]),
    },
  };
}
export const bdspDexLabels = {
  zh: {
    state: "图鉴状态",
    states: ["未登记", "听说过", "见过", "已捕获"],
    national: "已获得全国图鉴",
    give: "当前种类：勾选状态、性别与语言",
    giveNone: "当前种类：清除状态、性别与语言",
    formsClear: "当前种类：清除普通和闪光形态",
    formsRegular: "当前种类：全部普通形态，清除闪光",
    formsShiny: "当前种类：补全闪光形态",
    clear: "全图鉴：清除全部记录",
    regular: "普通形态",
    shiny: "闪光形态",
    regions: ["雄性", "雌性", "闪光雄性", "闪光雌性"],
    note: "状态、性别、语言和形态可以独立编辑。当前种类勾选／清除不改形态；全图鉴全部捕获会清除闪光性别标记，并补充存档语言。全部见过和完整记录可选择包含闪光；未选时保留已有闪光。完整记录登记全部语言。所有操作可撤销。",
  },
  en: {
    state: "Pokédex state",
    states: ["None", "Heard of", "Seen", "Captured"],
    national: "National Pokédex obtained",
    give: "Current species: check state, genders and languages",
    giveNone: "Current species: clear state, genders and languages",
    formsClear: "Current species: clear regular and shiny forms",
    formsRegular: "Current species: all regular forms, clear shiny",
    formsShiny: "Current species: add all shiny forms",
    clear: "Whole Pokédex: clear all records",
    regular: "Regular forms",
    shiny: "Shiny forms",
    regions: ["Male", "Female", "Shiny male", "Shiny female"],
    note: "State, gender, language and form records are independent. Current-species check/clear leaves forms unchanged. Caught all clears shiny gender flags and adds the save language. Seen all and complete can include shiny records; otherwise existing shiny records remain. Complete registers all languages. Every operation can be undone.",
  },
  ja: {
    state: "図鑑の状態",
    states: ["未登録", "聞いた", "見た", "捕獲した"],
    national: "全国図鑑を入手済み",
    give: "現在の種類：状態・性別・言語を登録",
    giveNone: "現在の種類：状態・性別・言語を消去",
    formsClear: "現在の種類：通常・色違いフォルムを消去",
    formsRegular: "現在の種類：通常を全登録、色違いを消去",
    formsShiny: "現在の種類：色違いフォルムを全登録",
    clear: "全図鑑：全記録を消去",
    regular: "通常フォルム",
    shiny: "色違いフォルム",
    regions: ["オス", "メス", "色違いオス", "色違いメス"],
    note: "状態・性別・言語・フォルムは独立して編集できます。現在の種類の登録／消去はフォルムを変更しません。全捕獲は色違い性別を消去し、セーブの言語を追加します。全遭遇・全記録では色違いを含めるか選べます。含めない場合も既存の色違いを保持します。全記録は全言語を登録します。操作は元に戻せます。",
  },
};
