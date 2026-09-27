import type { LocalizedText } from "./domain";
export interface Dex7Size {
  used: boolean;
  height: number;
  weight: number;
  flagged: boolean;
}
export interface Capture7Entry {
  species: number;
  name: LocalizedText;
  captured: string;
  transferred: string;
}
export interface Capture7Catalog {
  entries: Capture7Entry[];
  totalCaptured: string;
  totalTransferred: string;
}
export interface Capture7Edit {
  kind: "entry" | "sum" | "all";
  species: number;
  captured: string;
  transferred: string;
  totalCaptured: string;
  totalTransferred: string;
}
export function validateCapture7(
  edit: Capture7Edit,
  catalog: Capture7Catalog,
): Capture7Edit {
  const old = catalog.entries.find((e) => e.species === edit.species);
  if (!old || !["entry", "sum", "all"].includes(edit.kind))
    throw new Error("Pokedex capture action is invalid.");
  for (const [value, max, previous, keep] of [
    [edit.captured, 9999, old.captured, edit.kind !== "all"],
    [edit.transferred, 999999999, old.transferred, edit.kind !== "all"],
    [edit.totalCaptured, 999999999, catalog.totalCaptured, true],
    [edit.totalTransferred, 999999999, catalog.totalTransferred, true],
  ] as const) {
    if (
      !/^\d{1,10}$/.test(value) ||
      Number(value) > 4294967295 ||
      (Number(value) > max && (!keep || Number(value) !== Number(previous)))
    )
      throw new Error("Pokedex capture count is invalid.");
  }
  return { ...edit };
}
export function toggleSizeUsed(s: Dex7Size, used: boolean): Dex7Size {
  return used
    ? { ...s, used }
    : { used: false, height: 254, weight: 127, flagged: false };
}
export const letsGoLabels = {
  zh: {
    sizes: "体型纪录",
    groups: ["最小身高", "最大身高", "最小体重", "最大体重"],
    used: "已记录",
    height: "身高值",
    weight: "体重值",
    flag: "纪录标记",
    sizeNote:
      "数值为 0–255 的体型系数，不是厘米或千克。身高 254 与体重 127 的组合表示未记录。",
    capture: "捕获与传送次数",
    captured: "当前种类捕获次数",
    transferred: "当前种类传送次数",
    totalCaptured: "总捕获次数",
    totalTransferred: "总传送次数",
    sum: "应用当前次数并重新合计",
    all: "以当前次数批量设置",
    max: "最大值／归零",
    apply: "应用次数",
    reset: "重置草稿",
    choose: "选择种类",
    captureNote:
      "捕获上限 9,999，传送及总数上限 999,999,999。批量非零值只设置图鉴中已捕获的种类，零值清除所有 153 种；总数只随批量结果降低，使用重新合计可更新总数。",
    give: "当前条目：补全图鉴标记",
    giveNone: "当前条目：清除图鉴标记",
    note: "保留全部图鉴条目供手动编辑。正向批量只处理 1–151、808、809 及适用形态，跳过搭档形态；全部捕获会补本体缺失的体型纪录。清除全部记录包含形态体型纪录，但不改捕获／传送次数。当前条目操作仅修改图鉴标记。",
  },
  en: {
    sizes: "Size records",
    groups: [
      "Minimum height",
      "Maximum height",
      "Minimum weight",
      "Maximum weight",
    ],
    used: "Recorded",
    height: "Height scalar",
    weight: "Weight scalar",
    flag: "Record flag",
    sizeNote:
      "Values are 0–255 scalars, not centimetres or kilograms. Height 254 together with weight 127 means unrecorded.",
    capture: "Capture and transfer counts",
    captured: "Species captured",
    transferred: "Species transferred",
    totalCaptured: "Total captured",
    totalTransferred: "Total transferred",
    sum: "Apply counts and recalculate totals",
    all: "Apply current counts in bulk",
    max: "Maximum / zero",
    apply: "Apply counts",
    reset: "Reset draft",
    choose: "Choose species",
    captureNote:
      "Capture limit: 9,999. Transfers and totals: 999,999,999. Nonzero bulk values affect owned species only; zero clears all 153 species. Bulk totals only decrease; recalculate to refresh them.",
    give: "Current entry: complete dex flags",
    giveNone: "Current entry: clear dex flags",
    note: "All stored dex entries remain manually editable. Positive bulk operations cover species 1–151, 808, 809 and applicable forms, skipping partners. Caught all fills missing base size records. Clear all includes form size records but leaves capture/transfer counts intact. Current-entry commands change dex flags only.",
  },
  ja: {
    sizes: "サイズ記録",
    groups: ["最小の高さ", "最大の高さ", "最小の重さ", "最大の重さ"],
    used: "記録あり",
    height: "高さの係数",
    weight: "重さの係数",
    flag: "記録フラグ",
    sizeNote:
      "数値は0–255の係数です。cmやkgではありません。高さ254・重さ127の組み合わせは未記録を表します。",
    capture: "捕獲・転送回数",
    captured: "この種類の捕獲回数",
    transferred: "この種類の転送回数",
    totalCaptured: "総捕獲回数",
    totalTransferred: "総転送回数",
    sum: "回数を適用して合計を再計算",
    all: "現在の回数で一括設定",
    max: "最大値／ゼロ",
    apply: "回数を適用",
    reset: "下書きをリセット",
    choose: "種類を選択",
    captureNote:
      "捕獲上限9,999、転送と総数の上限999,999,999。一括設定の非ゼロ値は捕獲済みの種類のみ、ゼロは全153種に適用します。一括設定で総数は減少のみ更新され、再計算で合計に更新できます。",
    give: "現在の項目：図鑑フラグを登録",
    giveNone: "現在の項目：図鑑フラグを消去",
    note: "保存された全図鑑項目を手動編集できます。一括登録は1–151・808・809と対応フォルムが対象で、相棒を除外します。全捕獲は基本の未記録サイズを補完します。全消去はフォルムのサイズも消去しますが、捕獲・転送回数は保持します。現在の項目の操作は図鑑フラグのみ変更します。",
  },
};
