import {
  validateDex5,
  type Dex5State,
  type Dex5Entry,
  type Dex5Edit,
} from "./gen5Pokedex";
export function parseDex6Count(value: string): number {
  if (!/^[0-9 _]{0,5}$/.test(value))
    throw new Error("Pokedex count is invalid.");
  return Math.min(Number(value.replace(/[^0-9]/g, "")), 65535);
}
export function validateDex6(
  state: Dex5State,
  entry: Dex5Entry,
  oras: boolean,
): Dex5Edit {
  const edit = validateDex5(state, entry, 721);
  if (oras) {
    if (
      state.foreign != null ||
      typeof state.countSeen !== "string" ||
      typeof state.countObtained !== "string"
    )
      throw new Error("Pokedex ORAS fields are invalid.");
    parseDex6Count(state.countSeen);
    parseDex6Count(state.countObtained);
  } else if (
    (state.species <= 649
      ? typeof state.foreign !== "boolean"
      : state.foreign != null) ||
    state.countSeen != null ||
    state.countObtained != null
  )
    throw new Error("Pokedex XY fields are invalid.");
  return edit;
}
export const dex6Labels = {
  zh: {
    foreign: "旧世代获得记录",
    countSeen: "遇见次数",
    countObtained: "获得次数",
    counts:
      "最多 5 位数字；空白为 0，超过 65535 时按上游规则保存为 65535。获得次数可编辑，但游戏没有实际调用该计数。",
    dexNavAll: "全图鉴：DexNav 遇见次数设为 999",
    dexNavClear: "全图鉴：DexNav 遇见次数清零",
    hex: "按 32 位十六进制读取。空白为 0，忽略非十六进制字符，超出 8 位保留末尾 8 位有效数字。",
    noteXY:
      "批量清除见过同时清除旧世代获得标记，保留捕获、显示、形态和语言。形态操作作用于全图鉴；操作可撤销。",
    noteOR:
      "全图鉴清除见过同时清零遇见／获得次数。当前种类清除见过时，若已捕获，遇见次数按上游保存为 1。DexNav 操作只改遇见次数；操作可撤销。",
  },
  en: {
    foreign: "Obtained in an earlier generation",
    countSeen: "Encounter count",
    countObtained: "Obtained count",
    counts:
      "Up to 5 digits. Empty means 0; values above 65535 are saved as 65535. Obtained count is editable, but the game does not actually use it.",
    dexNavAll: "All species: set DexNav encounters to 999",
    dexNavClear: "All species: clear DexNav encounter counts",
    hex: "Parsed as a 32-bit hexadecimal value. Empty means 0; non-hex characters are ignored, and only the last 8 valid digits remain.",
    noteXY:
      "Batch clear seen also clears earlier-generation obtained flags. Caught, displayed, forms and languages remain. Form operations affect the entire Pokédex. Operations can be undone.",
    noteOR:
      "All-species clear seen also clears encounter/obtained counts. Clearing the current species sets encounter count to 1 if it is caught, as upstream does. DexNav operations only change encounter counts. Operations can be undone.",
  },
  ja: {
    foreign: "過去世代で入手",
    countSeen: "遭遇回数",
    countObtained: "入手回数",
    counts:
      "最大5桁。空欄は0、65535を超える値は65535として保存します。入手回数は編集可能ですが、ゲームは実際には使用しません。",
    dexNavAll: "全種類：DexNav遭遇回数を999に設定",
    dexNavClear: "全種類：DexNav遭遇回数を0に設定",
    hex: "32ビット16進数として読み込みます。空欄は0、16進数以外の文字は無視し、有効数字の末尾8桁を保存します。",
    noteXY:
      "一括で発見を解除すると過去世代入手フラグも解除します。捕獲・表示・フォルム・言語は保持します。フォルム操作は図鑑全体が対象です。取り消せます。",
    noteOR:
      "全種類の発見解除は遭遇・入手回数も0にします。現在の種類の発見解除では、捕獲済みなら上流と同じく遭遇回数を1にします。DexNav操作は遭遇回数のみ変更します。取り消せます。",
  },
};
