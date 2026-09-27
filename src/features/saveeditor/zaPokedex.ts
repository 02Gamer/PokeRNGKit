import type { LocalizedText } from "./domain";
export interface Dex9aState {
  species: number;
  forms: boolean[][];
  languages: boolean[];
  genders: boolean[];
  mega: boolean[];
  isNew: boolean;
  alpha: boolean;
  displayForm: number;
  displayGender: number;
  displayShiny: boolean;
}
export interface Dex9aEntry {
  state: Dex9aState;
  number: number;
  name: LocalizedText;
  formChoices: LocalizedText[];
  megaChoices: LocalizedText[];
}
export interface Dex9aCatalog {
  canEdit: boolean;
  entries: Dex9aEntry[];
}
export type Dex9aAction =
  "give" | "clear" | "seen" | "caught" | "uncaught" | "complete";
export type Dex9aEdit =
  | { action: "entry"; entry: Dex9aState }
  | { action: Dex9aAction; species?: number; shiny?: boolean };
export const dex9aShiny = (action: Dex9aAction) =>
  ["give", "seen", "caught", "complete"].includes(action);
export function validateDex9a(state: Dex9aState, entry: Dex9aEntry): Dex9aEdit {
  const old = entry.state;
  if (
    !Number.isInteger(state.species) ||
    state.species !== old.species ||
    state.species < 1 ||
    state.species > 1000 ||
    state.forms.length !== 3 ||
    state.forms.some((r) => r.length !== 32) ||
    state.languages.length !== 10 ||
    state.genders.length !== 3 ||
    state.mega.length !== old.mega.length ||
    state.mega.length < 1 ||
    state.mega.length > 3 ||
    [
      ...state.forms,
      state.languages,
      state.genders,
      state.mega,
      [state.isNew, state.alpha, state.displayShiny],
    ].some((r) => r.some((v) => typeof v !== "boolean"))
  )
    throw new Error("Pokedex choices are invalid.");
  for (const [value, original, max] of [
    [state.displayForm, old.displayForm, 31],
    [state.displayGender, old.displayGender, 3],
  ])
    if (
      !Number.isInteger(value) ||
      value < 0 ||
      value > 255 ||
      (value !== original && value > max)
    )
      throw new Error("Pokedex choices are invalid.");
  return {
    action: "entry",
    entry: {
      ...state,
      forms: state.forms.map((r) => [...r]),
      languages: [...state.languages],
      genders: [...state.genders],
      mega: [...state.mega],
    },
  };
}
export const zaDexLabels = {
  zh: {
    alpha: "头目",
    mega: "超级进化记录",
    displayGenders: ["无性别", "雄性", "雌性", "有性别（无差异）"],
    columns: ["捕获", "见过", "异色见过"],
    latam: "西班牙语（拉美）",
    note: "三组形态记录独立保存。清除捕获会清空捕获、语言及显示设置，保留见过、头目和超级进化记录；清除全部会清空图鉴。所有操作可撤销。",
  },
  en: {
    alpha: "Alpha",
    mega: "Mega Evolution records",
    displayGenders: [
      "Genderless",
      "Male",
      "Female",
      "Gendered (no difference)",
    ],
    columns: ["Caught", "Seen", "Shiny seen"],
    latam: "Spanish (Latin America)",
    note: "The three form groups are independent. Clear caught clears caught forms, languages and display settings while retaining seen, Alpha and Mega records. Clear all empties the Pokédex. Every operation can be undone.",
  },
  ja: {
    alpha: "オヤブン",
    mega: "メガシンカ記録",
    displayGenders: ["性別不明", "オス", "メス", "性別あり（姿の違いなし）"],
    columns: ["捕獲", "発見", "色違い発見"],
    latam: "スペイン語（中南米）",
    note: "３組のフォルム記録は独立しています。捕獲解除は捕獲・言語・表示設定を消去し、発見・オヤブン・メガシンカ記録を保持します。全消去は図鑑全体が対象です。操作は元に戻せます。",
  },
};
