// SPDX-License-Identifier: GPL-3.0-or-later
import type { LocalizedText } from "./domain";
export interface MoveShopRow {
  index: number;
  move: number;
  type: number;
  permitted: boolean;
  purchased: boolean;
  mastered: boolean;
  name: LocalizedText;
  typeName: LocalizedText;
}
export const moveShopWords = {
  zh: {
    title: "招式商店",
    read: "读取记录",
    index: "序号",
    type: "属性",
    move: "招式",
    purchased: "已购买",
    mastered: "已掌握",
    permitted: "可购买",
    unavailable: "不可购买",
    note: "不可购买的招式仍可手动编辑；勾选记录不代表合法性通过。",
    action: "操作",
    save: "保存勾选记录",
    current: "建议当前招式",
    all: "建议全部招式",
    clearCurrent: "清空后建议当前招式",
    none: "清空购买与掌握",
    encounterReset: "按遭遇恢复初始记录",
    resetNote: "按遭遇恢复会忽略尚未保存的勾选。",
    preview: "预览修改",
    confirm: "确认应用",
    cancel: "取消预览",
    changed: "变更记录",
    bytes: "变更字节",
    yes: "是",
    no: "否",
    before: "修改前",
    after: "修改后",
    failed: "招式商店操作失败，请重新读取记录。",
    loading: "正在读取…",
    noChange: "没有字节变更",
  },
  en: {
    title: "Move Shop",
    read: "Read records",
    index: "Index",
    type: "Type",
    move: "Move",
    purchased: "Purchased",
    mastered: "Mastered",
    permitted: "Purchasable",
    unavailable: "Not purchasable",
    note: "Records remain editable for unavailable moves; checked flags do not establish legality.",
    action: "Action",
    save: "Save checked records",
    current: "Suggest current moves",
    all: "Suggest all moves",
    clearCurrent: "Clear and suggest current moves",
    none: "Clear purchased and mastered",
    encounterReset: "Restore initial encounter records",
    resetNote: "Encounter restoration ignores unsaved checkboxes.",
    preview: "Preview changes",
    confirm: "Apply changes",
    cancel: "Cancel preview",
    changed: "Changed records",
    bytes: "Changed bytes",
    yes: "Yes",
    no: "No",
    before: "Before",
    after: "After",
    failed: "Move Shop operation failed. Read the records again.",
    loading: "Reading…",
    noChange: "No byte changes",
  },
  ja: {
    title: "技ショップ",
    read: "記録を読み込む",
    index: "番号",
    type: "タイプ",
    move: "技",
    purchased: "購入済み",
    mastered: "皆伝済み",
    permitted: "購入可能",
    unavailable: "購入不可",
    note: "購入できない技も手動で編集できます。チェック済みの記録が合法性を保証するわけではありません。",
    action: "操作",
    save: "チェックした記録を保存",
    current: "現在の技を提案",
    all: "すべての技を提案",
    clearCurrent: "消去後に現在の技を提案",
    none: "購入と皆伝の記録を消去",
    encounterReset: "遭遇時の初期記録を復元",
    resetNote: "遭遇時の復元では未保存のチェックを使用しません。",
    preview: "変更をプレビュー",
    confirm: "変更を適用",
    cancel: "プレビューを取消",
    changed: "変更された記録",
    bytes: "変更バイト数",
    yes: "はい",
    no: "いいえ",
    before: "変更前",
    after: "変更後",
    failed: "技ショップの操作に失敗しました。記録を再読み込みしてください。",
    loading: "読み込み中…",
    noChange: "バイトの変更はありません",
  },
} as const;
export interface MoveShopCatalog {
  sourceHash: string;
  species: number;
  form: number;
  level: number;
  rows: MoveShopRow[];
  purchasedRaw: string;
  masteredRaw: string;
}
export interface MoveShopRowEdit {
  index: number;
  purchased: boolean;
  mastered: boolean;
}
export type MoveShopAction =
  "save" | "current" | "all" | "clearCurrent" | "none" | "encounterReset";
export interface MoveShopEdit {
  action: MoveShopAction;
  rows: MoveShopRowEdit[];
}
export interface MoveShopTarget {
  kind: "save" | "file";
  box: number;
  slot: number;
  fileName: string | null;
  inputEncrypted: boolean;
  useFileFormat: boolean;
}
export interface MoveShopTicket {
  token: string;
  sourceHash: string;
  targetHash: string;
  target: MoveShopTarget;
  before: MoveShopCatalog;
  result: MoveShopCatalog;
  changedRows: number[];
  changedBytes: number;
}
export interface MoveShopConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
  target: MoveShopTarget;
}
export function validateMoveShopCatalog(catalog: MoveShopCatalog) {
  if (
    !/^[A-F0-9]{64}$/.test(catalog.sourceHash) ||
    !Number.isInteger(catalog.species) ||
    catalog.species < 1 ||
    !Number.isInteger(catalog.level) ||
    catalog.level < 1 ||
    catalog.level > 100 ||
    catalog.rows.length !== 61 ||
    new Set(catalog.rows.map((r) => r.index)).size !== 61 ||
    !/^[A-F0-9]{16}$/.test(catalog.purchasedRaw) ||
    !/^[A-F0-9]{16}$/.test(catalog.masteredRaw) ||
    catalog.rows.some(
      (r) =>
        !Number.isInteger(r.index) ||
        r.index < 0 ||
        r.index >= 61 ||
        !Number.isInteger(r.move) ||
        r.move < 1 ||
        !Number.isInteger(r.type) ||
        r.type < 0 ||
        r.type > 17 ||
        [r.purchased, r.mastered, r.permitted].some(
          (value) => typeof value !== "boolean",
        ) ||
        (["zh", "en", "ja"] as const).some(
          (lang) => !r.name?.[lang] || !r.typeName?.[lang],
        ),
    )
  )
    throw new Error("Invalid Move Shop catalog");
  return catalog;
}
export type MoveShopSortKey =
  "index" | "type" | "name" | "purchased" | "mastered";
export function sortMoveShopRows(
  rows: MoveShopRow[],
  key: MoveShopSortKey,
  descending: boolean,
  lang: "zh" | "en" | "ja",
) {
  return rows.slice().sort((a, b) => {
    const comparison =
      key === "name"
        ? a.name[lang].localeCompare(b.name[lang])
        : key === "type"
          ? a.type - b.type ||
            Number(b.permitted) - Number(a.permitted) ||
            a.name[lang].localeCompare(b.name[lang])
          : Number(a[key]) - Number(b[key]);
    return (descending ? -comparison : comparison) || a.index - b.index;
  });
}
export function moveShopConfirmation(
  catalog: MoveShopCatalog,
  target: MoveShopTarget,
  ticket: MoveShopTicket,
): MoveShopConfirmation {
  if (
    !/^move-shop:\d+$/.test(ticket.token) ||
    ticket.sourceHash !== catalog.sourceHash ||
    !/^[A-F0-9]{64}$/.test(ticket.targetHash) ||
    ticket.before.sourceHash !== ticket.sourceHash ||
    ticket.result.sourceHash !== ticket.targetHash ||
    (Object.keys(target) as (keyof MoveShopTarget)[]).some(
      (key) => ticket.target[key] !== target[key],
    ) ||
    ticket.before.rows.length !== 61 ||
    ticket.result.rows.length !== 61
  )
    throw new Error("Move Shop preview is stale or targets another entity");
  return {
    token: ticket.token,
    sourceHash: ticket.sourceHash,
    targetHash: ticket.targetHash,
    target: structuredClone(target),
  };
}
export function moveShopEdit(
  catalog: MoveShopCatalog,
  action: MoveShopAction,
  rows: MoveShopRowEdit[],
): MoveShopEdit {
  if (
    !/^[A-F0-9]{64}$/.test(catalog.sourceHash) ||
    catalog.rows.length !== 61 ||
    ![
      "save",
      "current",
      "all",
      "clearCurrent",
      "none",
      "encounterReset",
    ].includes(action)
  )
    throw new Error("Invalid Move Shop source/action");
  if (action === "encounterReset") {
    if (rows.length)
      throw new Error("Encounter reset does not save window rows");
  } else if (
    rows.length !== 61 ||
    new Set(rows.map((r) => r.index)).size !== 61 ||
    rows.some(
      (r) =>
        !Number.isInteger(r.index) ||
        r.index < 0 ||
        r.index >= 61 ||
        typeof r.purchased !== "boolean" ||
        typeof r.mastered !== "boolean",
    )
  )
    throw new Error("Invalid Move Shop rows");
  return { action, rows: structuredClone(rows) };
}
