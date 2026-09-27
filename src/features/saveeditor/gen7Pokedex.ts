import type { Dex7Size, Capture7Catalog, Capture7Edit } from "./letsGoPokedex";
import type { LocalizedText } from "./domain";
export interface Dex7State {
  index: number;
  caught: boolean | null;
  seen: boolean[];
  displayed: boolean[];
  languages: boolean[];
  sizes?: Dex7Size[] | null;
}
export interface Dex7Entry {
  state: Dex7State;
  species: number;
  form: number;
  name: LocalizedText;
  formName: LocalizedText;
  allowedRegions: boolean[];
}
export interface Dex7Catalog {
  canEdit: boolean;
  entries: Dex7Entry[];
  captures?: Capture7Catalog | null;
}
export type Dex7Action =
  "give" | "giveNone" | "clear" | "seen" | "caught" | "uncaught" | "complete";
export type Dex7Edit =
  | { action: "entry"; entry: Dex7State }
  | { action: Dex7Action; index: number }
  | { action: "capture"; capture: Capture7Edit };
export function toggleDex7(
  state: Dex7State,
  region: number,
  display: boolean,
  value: boolean,
): Dex7State {
  const seen = [...state.seen];
  let displayed = [...state.displayed];
  if (display) {
    displayed[region] = value;
    if (value) {
      displayed = displayed.map((_, i) => i === region);
      seen[region] = true;
    }
  } else {
    seen[region] = value;
    if (!seen.some(Boolean)) displayed.fill(false);
    else if (value && !displayed.some(Boolean)) displayed[region] = true;
  }
  return { ...state, seen, displayed };
}
export function validateDex7(state: Dex7State, entry: Dex7Entry): Dex7Edit {
  const old = entry.state;
  if (
    (old.sizes
      ? !state.sizes ||
        state.sizes.length !== 4 ||
        state.sizes.some(
          (s) =>
            typeof s.used !== "boolean" ||
            typeof s.flagged !== "boolean" ||
            !Number.isInteger(s.height) ||
            !Number.isInteger(s.weight) ||
            s.height < 0 ||
            s.height > 255 ||
            s.weight < 0 ||
            s.weight > 255,
        )
      : state.sizes != null) ||
    state.index !== old.index ||
    state.seen.length !== 4 ||
    state.displayed.length !== 4 ||
    state.languages.length !== (entry.form === 0 ? 9 : 0) ||
    (entry.form === 0
      ? typeof state.caught !== "boolean"
      : state.caught !== null) ||
    [state.seen, state.displayed, state.languages].some((a) =>
      a.some((v) => typeof v !== "boolean"),
    ) ||
    entry.allowedRegions.some(
      (allowed, i) =>
        !allowed &&
        ((state.seen[i] && !old.seen[i]) ||
          (state.displayed[i] && !old.displayed[i])),
    ) ||
    (state.displayed.some((v, i) => v !== old.displayed[i]) &&
      (state.displayed.filter(Boolean).length > 1 ||
        state.displayed.some(
          (v, i) => v && !old.displayed[i] && !state.seen[i],
        )))
  )
    throw new Error("Pokedex choices are invalid.");
  return {
    action: "entry",
    entry: {
      ...state,
      seen: [...state.seen],
      displayed: [...state.displayed],
      languages: [...state.languages],
    },
  };
}
export const dex7Labels = {
  zh: {
    form: "形态",
    base: "本体",
    give: "当前条目：完整记录",
    giveNone: "当前条目：清除全部记录",
    clear: "全图鉴：清除全部记录",
    note: "包含游戏支持的全部种类和独立形态条目，不限于阿罗拉图鉴。形态只记录见过和显示；捕获及九种语言在本体设置。批量补全包含闪光，形态显示保持原状；全部捕获以存档语言替换语言记录，完整记录登记全部语言。操作均可撤销。",
  },
  en: {
    form: "Form",
    base: "Base",
    give: "Current entry: complete records",
    giveNone: "Current entry: clear all records",
    clear: "Whole Pokédex: clear all records",
    note: "All supported species and separate form entries are included, beyond the Alola Pokédex. Forms store seen/displayed flags only; ownership and nine languages belong to the base entry. Batch completion includes shiny records and preserves form displays. Caught all replaces languages with the save language; complete registers all languages. All operations can be undone.",
  },
  ja: {
    form: "フォルム",
    base: "基本",
    give: "現在の項目：全記録を登録",
    giveNone: "現在の項目：全記録を消去",
    clear: "全図鑑：全記録を消去",
    note: "アローラ図鑑の範囲に限らず、対応する全種と独立フォルムを表示します。フォルムは遭遇・表示のみ記録し、捕獲と9言語は基本の項目で設定します。一括登録は色違いを含み、フォルム表示を保持します。全捕獲は言語をセーブの言語に置換し、全記録は全言語を登録します。操作は元に戻せます。",
  },
};
