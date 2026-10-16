// SPDX-License-Identifier: GPL-3.0-or-later
import type { OriginChoice } from "./domain";
export interface TrainerIdInfo {
  format: string;
  tid: string;
  sid: string;
  tidWidth: number;
  sidWidth: number;
  id32: number;
  tid16: number;
  sid16: number;
  tsv: number;
}
export function trainerIdInput(
  info: TrainerIdInfo | null | undefined,
  tid: string,
  sid: string,
): { tid: string; sid: string } | undefined {
  if (!info) return undefined;
  if (
    tid.length > info.tidWidth ||
    sid.length > info.sidWidth ||
    !/^[\d ]*$/.test(tid) ||
    !/^[\d ]*$/.test(sid)
  )
    throw Error("Invalid trainer ID mask");
  return tid !== info.tid || sid !== info.sid ? { tid, sid } : undefined;
}
export interface ExpertCatalog {
  ability: number;
  abilityNumber: number | null;
  abilities: OriginChoice[];
  extraBytes: { offset: number; value: number }[];
}
export interface ExpertEdit {
  action: "values" | "abilityFromNumber";
  ability?: number;
  abilityNumber?: number;
  offset?: number;
  byteValue?: number;
}
export function expertDraft(info: ExpertCatalog) {
  return {
    ability: String(info.ability),
    abilityNumber: String(info.abilityNumber ?? 0),
    offset: String(info.extraBytes[0]?.offset ?? 0),
    byteValue: String(info.extraBytes[0]?.value ?? 0),
  };
}
export type ExpertDraft = ReturnType<typeof expertDraft>;
/** Masked decimal controls use Util.ToInt32; an empty/space-filled input is zero. */
export function expertMask(text: string, width: number) {
  if (text.length > width || !/^[\d ]*$/.test(text))
    throw Error("Invalid expert decimal mask");
  const normalized = text.trim();
  return /^\d+$/.test(normalized) ? Number(normalized) : 0;
}
export function expertValues(
  info: ExpertCatalog,
  draft: ExpertDraft,
): ExpertEdit | undefined {
  const edit: ExpertEdit = { action: "values" };
  if (draft.ability !== String(info.ability)) {
    const ability = Number(draft.ability);
    if (
      !/^\d+$/.test(draft.ability) ||
      !info.abilities.some((c) => c.id === ability)
    )
      throw Error("Invalid manual ability");
    edit.ability = ability;
  }
  if (draft.abilityNumber !== String(info.abilityNumber ?? 0)) {
    if (info.abilityNumber === null) throw Error("Ability number unavailable");
    edit.abilityNumber = expertMask(draft.abilityNumber, 1);
  }
  if (info.extraBytes.length) {
    const entry = info.extraBytes.find(
      (b) => String(b.offset) === draft.offset,
    );
    if (!entry) throw Error("Unknown extra-byte offset");
    const value = expertMask(draft.byteValue, 3);
    if (value !== entry.value) {
      edit.offset = entry.offset;
      edit.byteValue = value;
    }
  }
  return Object.keys(edit).length > 1 ? edit : undefined;
}
export const identityToolsWords = {
  zh: {
    bytePending: "请先应用或还原当前字节，再切换偏移。",
    title: "开发特性与额外字节",
    load: "读取高级字段",
    ability: "手动特性",
    abilityNumber: "特性编号",
    derive: "按编号查找特性",
    offset: "额外字节偏移",
    byteValue: "字节值",
    apply: "应用高级字段",
    revert: "还原输入",
    note: "只显示格式支持的特性及额外字节目录。字节值按三位十进制输入并限制到 255；特性编号沿一位输入和实际存储位宽保存。修改工作副本后需重新读取。",
    error: "请检查特性、编号与额外字节目录。",
  },
  en: {
    bytePending:
      "Apply or revert the current byte before selecting another offset.",
    title: "Developer abilities and extra bytes",
    load: "Read advanced fields",
    ability: "Manual ability",
    abilityNumber: "Ability number",
    derive: "Look up ability by number",
    offset: "Extra-byte offset",
    byteValue: "Byte value",
    apply: "Apply advanced fields",
    revert: "Revert inputs",
    note: "Only format-supported abilities and source extra-byte offsets are listed. Byte values use three decimal positions and cap at 255; ability numbers follow the one-position mask and actual storage width. Reload after the working copy changes.",
    error: "Check the ability, number, and extra-byte directory.",
  },
  ja: {
    bytePending:
      "別の位置を選ぶ前に、現在のバイトを適用するか元に戻してください。",
    title: "開発用の特性と追加バイト",
    load: "高度な項目を読み込む",
    ability: "手動の特性",
    abilityNumber: "特性番号",
    derive: "番号から特性を検索",
    offset: "追加バイトの位置",
    byteValue: "バイト値",
    apply: "高度な項目を適用",
    revert: "入力を元に戻す",
    note: "形式に対応した特性と追加バイトの位置を表示します。バイト値は10進3桁で上限255、特性番号は1桁と実際の保存幅に従います。作業コピー変更後は再読み込みしてください。",
    error: "特性、番号、追加バイトの一覧を確認してください。",
  },
};
