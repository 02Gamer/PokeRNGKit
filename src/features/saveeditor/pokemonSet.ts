// SPDX-License-Identifier: GPL-3.0-or-later
import type { LocalizedText, PokemonEntry, PokemonPosition } from "./domain";
import type { PokemonDraftCapture } from "./pokemonDraftPlan";
import type { StandalonePokemonSnapshot } from "./standalonePokemon";
export interface PokemonEditorFile {
  fileName: string;
  data: string;
}
export interface PokemonEditorSaveContext {
  bytes: Uint8Array;
  source: PokemonPosition;
  recognition?: import("./saveDetection").SaveDetectionChoice;
  brProfile?: number;
}
export interface PokemonEditorHandle {
  capture(): {
    snapshot: StandalonePokemonSnapshot;
    capture: PokemonDraftCapture;
  };
  accept(file: PokemonEditorFile): void;
}
export interface PokemonSetTicket {
  token: string;
  sourceHash: string;
  targetHash: string;
  source: PokemonPosition;
  target: PokemonPosition;
  pokemon: PokemonEntry;
  editorFile: PokemonEditorFile;
  compatibility: LocalizedText[];
  overwrite: boolean;
  changedBytes: number;
  clear?: boolean;
}
export interface PokemonSetConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
  allowCompatibility: boolean;
}
export interface PokemonSetActions {
  open(
    source: PokemonPosition,
  ): Promise<
    { file: PokemonEditorFile; context: PokemonEditorSaveContext } | undefined
  >;
  context(
    source: PokemonPosition,
  ): Promise<PokemonEditorSaveContext | undefined>;
  preview(request: {
    source: PokemonPosition;
    target: PokemonPosition;
    capture: PokemonDraftCapture;
    editorFile: PokemonEditorFile;
  }): Promise<PokemonSetTicket | undefined>;
  apply(confirmation: PokemonSetConfirmation): Promise<boolean>;
  discard(token: string): void;
}
export function editorSnapshot(
  file: PokemonEditorFile,
): StandalonePokemonSnapshot {
  if (
    !file ||
    !file.fileName ||
    file.fileName.length > 1024 ||
    typeof file.data !== "string" ||
    file.data.length > 1024 * 1024
  )
    throw Error("Invalid editor file.");
  const bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
  if (!bytes.length) throw Error("Empty editor file.");
  return {
    bytes,
    fileName: file.fileName,
    inputEncrypted: false,
    useFileFormat: true,
  };
}
export function editorFile(
  snapshot: StandalonePokemonSnapshot,
): PokemonEditorFile {
  if (
    snapshot.inputEncrypted ||
    !snapshot.useFileFormat ||
    !snapshot.bytes.length ||
    snapshot.bytes.length > 1024 * 1024
  )
    throw Error("Prepare a decrypted editor buffer first.");
  let binary = "";
  for (const byte of snapshot.bytes) binary += String.fromCharCode(byte);
  return { fileName: snapshot.fileName, data: btoa(binary) };
}
export function parsePokemonSet(
  value: unknown,
  sourceHash: string,
  source: PokemonPosition,
  target: PokemonPosition,
): PokemonSetTicket {
  const v = value as PokemonSetTicket | undefined;
  const position = (p: PokemonPosition | undefined) =>
    !!p &&
    Number.isInteger(p.box) &&
    p.box >= -1 &&
    Number.isInteger(p.slot) &&
    p.slot >= 0;
  if (
    !v ||
    typeof v.token !== "string" ||
    !/^set:\d+$/.test(v.token) ||
    v.sourceHash !== sourceHash ||
    !/^[A-F0-9]{64}$/.test(v.targetHash) ||
    !position(v.source) ||
    v.source.box !== source.box ||
    v.source.slot !== source.slot ||
    !position(v.target) ||
    v.target.box !== target.box ||
    (target.box === -1
      ? v.target.slot > target.slot || v.target.slot >= 6
      : v.target.slot !== target.slot) ||
    typeof v.overwrite !== "boolean" ||
    (v.clear !== undefined && typeof v.clear !== "boolean") ||
    !Number.isSafeInteger(v.changedBytes) ||
    v.changedBytes < 0 ||
    !v.pokemon ||
    v.pokemon.box !== v.target.box ||
    v.pokemon.slot !== v.target.slot ||
    v.pokemon.species < 0 ||
    (v.pokemon.species === 0 && v.clear !== true) ||
    !Array.isArray(v.compatibility) ||
    !v.compatibility.every(
      (t) => t && [t.zh, t.en, t.ja].every((s) => typeof s === "string"),
    )
  )
    throw Error("Prepared Pokemon preview is stale or incomplete.");
  editorSnapshot(v.editorFile);
  return structuredClone(v);
}
export const pokemonSetWords = {
  zh: {
    set: "放入当前编辑的宝可梦",
    title: "确认放入格位",
    clear: "清空目标格位",
    clearParty: "删除目标队伍格位，后续成员前移",
    note: "右侧修改保留在编辑缓冲中；放入格位后才会写入存档工作副本。",
    empty: "查看一只宝可梦以打开编辑缓冲。",
    loading: "正在读取宝可梦编辑缓冲…",
    failed: "宝可梦编辑或放入未完成，请检查输入、存档和目标格位。",
    confirm: "确认放入",
    cancel: "取消",
    overwrite: "覆盖目标格位现有的宝可梦",
    compatibility: "我已确认以下兼容性提示，继续放入",
    target: "目标格位",
    party: "队伍",
    box: "箱子",
    slot: "格位",
    editor: "宝可梦编辑缓冲",
    bytes: "变更字节",
    retry: "重新读取",
  },
  en: {
    set: "Set the edited Pokémon",
    title: "Confirm slot placement",
    clear: "Clear the destination slot",
    clearParty: "Delete the party slot and shift later members",
    note: "Changes on the right stay in the editor buffer. Set a slot to write them to the save working copy.",
    empty: "View a Pokémon to open its editor buffer.",
    loading: "Loading the Pokémon editor buffer…",
    failed:
      "Editing or placement failed. Check the inputs, save and destination.",
    confirm: "Set Pokémon",
    cancel: "Cancel",
    overwrite: "Replace the Pokémon already in this slot",
    compatibility:
      "I have reviewed these compatibility warnings and want to continue",
    target: "Destination",
    party: "Party",
    box: "Box",
    slot: "Slot",
    editor: "Pokémon editor buffer",
    bytes: "Changed bytes",
    retry: "Read again",
  },
  ja: {
    set: "編集中のポケモンを配置",
    title: "配置先を確認",
    clear: "配置先を空にする",
    clearParty: "手持ちのスロットを削除して後続を詰める",
    note: "右側の変更は編集バッファーに保持されます。スロットに配置するとセーブの作業コピーへ書き込まれます。",
    empty: "ポケモンを表示して編集バッファーを開いてください。",
    loading: "ポケモン編集バッファーを読み込み中…",
    failed:
      "編集または配置に失敗しました。入力、セーブ、配置先を確認してください。",
    confirm: "配置する",
    cancel: "キャンセル",
    overwrite: "配置先のポケモンを上書きする",
    compatibility: "互換性の注意事項を確認し、配置を続行する",
    target: "配置先",
    party: "手持ち",
    box: "ボックス",
    slot: "スロット",
    editor: "ポケモン編集バッファー",
    bytes: "変更バイト数",
    retry: "再読込",
  },
};
