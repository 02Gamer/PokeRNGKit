// SPDX-License-Identifier: GPL-3.0-or-later
export type ChatterAction =
  | { kind: "initialized"; initialized: boolean }
  | { kind: "import"; pcm: string };
export interface ChatterCatalog {
  canEdit: boolean;
  sourceHash: string;
  initialized: boolean;
  rawInitialized: number;
  confusionChance: number;
  canPlay: boolean;
  pcmSize: number;
  pcm: string;
  wav: string;
}
export interface ChatterRequest {
  sourceHash: string;
  actions: ChatterAction[];
}
export interface ChatterTicket {
  token: string;
  sourceHash: string;
  targetHash: string;
  before: ChatterCatalog;
  result: ChatterCatalog;
  changedOffsets: number[];
  changedPcmBytes: number;
}
export interface ChatterConfirmation {
  token: string;
  sourceHash: string;
  targetHash: string;
}
export const supportsChatter = (format: string) =>
  ["SAV4DP", "SAV4Pt", "SAV4HGSS", "SAV5BW", "SAV5B2W2"].includes(format);
const hash = (value: string) => /^[0-9A-F]{64}$/.test(value);
export function validateChatterCatalog(catalog: ChatterCatalog) {
  if (
    !hash(catalog.sourceHash) ||
    typeof catalog.canEdit !== "boolean" ||
    typeof catalog.initialized !== "boolean" ||
    typeof catalog.canPlay !== "boolean" ||
    !Number.isInteger(catalog.rawInitialized) ||
    catalog.rawInitialized < 0 ||
    catalog.rawInitialized > 0xffffffff ||
    !Number.isInteger(catalog.confusionChance) ||
    catalog.confusionChance < 0 ||
    catalog.confusionChance > 100 ||
    catalog.pcmSize !== 1000
  )
    throw Error("Invalid Chatter catalog.");
  chatterBytes(catalog.pcm, 1000);
  chatterBytes(catalog.wav, 2044);
  return catalog;
}
export function chatterBytes(base64: string, size: number) {
  const text = atob(base64);
  if (text.length !== size) throw Error("Invalid Chatter recording size.");
  return Uint8Array.from(text, (character) => character.charCodeAt(0));
}
export function chatterImport(bytes: Uint8Array): ChatterAction {
  if (bytes.length !== 1000)
    throw Error("Chatter PCM must contain exactly 1000 bytes.");
  return {
    kind: "import",
    pcm: btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")),
  };
}
export function chatterRequest(
  catalog: ChatterCatalog,
  actions: readonly ChatterAction[],
): ChatterRequest {
  if (!catalog.canEdit || !hash(catalog.sourceHash) || actions.length > 512)
    throw Error("Invalid Chatter request.");
  for (const action of actions) {
    if (action.kind === "initialized") {
      if (typeof action.initialized !== "boolean")
        throw Error("Invalid Chatter action.");
    } else if (action.kind === "import") {
      if (action.pcm.length > 2048) throw Error("Invalid Chatter PCM data.");
      chatterBytes(action.pcm, 1000);
    } else throw Error("Invalid Chatter action.");
  }
  return {
    sourceHash: catalog.sourceHash,
    actions: actions.map((action) => ({ ...action })),
  };
}
export function chatterConfirmation(
  catalog: ChatterCatalog,
  ticket: ChatterTicket,
): ChatterConfirmation {
  validateChatterCatalog(catalog);
  validateChatterCatalog(ticket.before);
  validateChatterCatalog(ticket.result);
  if (
    !catalog.canEdit ||
    ticket.sourceHash !== catalog.sourceHash ||
    ticket.before.sourceHash !== ticket.sourceHash ||
    ticket.result.sourceHash !== ticket.targetHash ||
    !hash(ticket.targetHash) ||
    !/^chatter:\d+$/.test(ticket.token)
  )
    throw Error("Chatter preview is stale.");
  return {
    token: ticket.token,
    sourceHash: ticket.sourceHash,
    targetHash: ticket.targetHash,
  };
}
export function chatterInitialized(
  catalog: ChatterCatalog,
  actions: readonly ChatterAction[],
) {
  return actions.reduce(
    (value, action) => (action.kind === "import" ? true : action.initialized),
    catalog.initialized,
  );
}
export const chatterWords = {
  zh: {
    title: "喋喋不休录音",
    read: "读取录音",
    initialized: "录音已初始化",
    chance: "混乱几率",
    play: "播放录音",
    stop: "停止播放",
    import: "导入 PCM",
    exportPcm: "导出 PCM",
    exportWav: "导出 WAV",
    preview: "预览修改",
    confirm: "确认应用",
    cancel: "取消修改",
    changes: "录音变化",
    changed: "变化文件字节",
    changedPcm: "变化录音字节",
    raw: "原始录音标记",
    pending: "预览后更新",
    invalid: "无法处理录音，请检查存档、PCM 文件长度及修改预览。",
    stale: "录音预览已失效，请重新预览。",
    playback: "无法播放录音，可导出 WAV 文件试听。",
    note: "混乱几率由录音内容计算。PCM 文件必须恰好 1000 字节。",
    empty: "没有可播放的录音。",
  },
  en: {
    title: "Chatter recording",
    read: "Read recording",
    initialized: "Initialized",
    chance: "Confusion chance",
    play: "Play recording",
    stop: "Stop playback",
    import: "Import PCM",
    exportPcm: "Export PCM",
    exportWav: "Export WAV",
    preview: "Preview changes",
    confirm: "Apply preview",
    cancel: "Discard changes",
    changes: "Recording changes",
    changed: "Changed save bytes",
    changedPcm: "Changed recording bytes",
    raw: "Raw recording flag",
    pending: "Updated after preview",
    invalid:
      "Unable to process the recording. Check the save, PCM file length and preview.",
    stale: "The recording preview is stale. Preview the changes again.",
    playback: "Unable to play the recording. Export WAV to listen to it.",
    note: "Confusion chance is computed from the recording. PCM files must contain exactly 1000 bytes.",
    empty: "No recording to play.",
  },
  ja: {
    title: "おしゃべりの録音",
    read: "録音を読み込む",
    initialized: "録音を初期化済み",
    chance: "混乱する確率",
    play: "録音を再生",
    stop: "再生を停止",
    import: "PCM を読み込む",
    exportPcm: "PCM を書き出す",
    exportWav: "WAV を書き出す",
    preview: "変更を確認",
    confirm: "確認した変更を適用",
    cancel: "変更を破棄",
    changes: "録音の変更",
    changed: "変更したセーブのバイト数",
    changedPcm: "変更した録音のバイト数",
    raw: "元の録音フラグ",
    pending: "変更の確認後に更新",
    invalid:
      "録音を処理できません。セーブ、PCM ファイルの長さ、変更の確認を見直してください。",
    stale: "録音の確認内容が古くなりました。再度確認してください。",
    playback: "録音を再生できません。WAV に書き出して再生してください。",
    note: "混乱する確率は録音から計算します。PCM ファイルは 1000 バイトである必要があります。",
    empty: "再生できる録音がありません。",
  },
};
