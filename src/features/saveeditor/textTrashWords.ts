// SPDX-License-Identifier: GPL-3.0-or-later
export const textTrashWords = {
  zh: {
    title: "姓名与原始字节",
    nickname: "昵称",
    originalTrainer: "初训家姓名",
    handlingTrainer: "接手训练家姓名",
    field: "姓名字段",
    read: "读取",
    loading: "正在读取…",
    text: "字符串",
    updateText: "更新文字草稿",
    characters: "特殊字符",
    bytes: "原始字节",
    offset: "字节位置",
    value: "十六进制数值",
    updateByte: "更新字节草稿",
    species: "种类",
    language: "语言",
    generation: "世代",
    layer: "名称层",
    applyLayer: "添加名称层",
    clear: "清空尾部字节",
    preview: "预览变更",
    confirm: "应用变更",
    cancel: "取消预览",
    reset: "丢弃草稿",
    stored: "原始存储",
    draft: "当前草稿",
    before: "变更前",
    after: "变更后",
    changed: "变更字节",
    none: "没有字节变化",
    readonly: "当前数据只能读取",
    failed: "文字编辑失败，请检查输入或重新读取。",
    pendingInput: "请先更新文字或字节草稿。",
    note: "文字编码、名称层和尾部清理遵循原版窗口规则。打开时的编码规范化也会列入预览；确认后只更新工作副本。",
    empty: "该字段没有字节缓冲。",
  },
  en: {
    title: "Names and raw bytes",
    nickname: "Nickname",
    originalTrainer: "Original trainer",
    handlingTrainer: "Handling trainer",
    field: "Name field",
    read: "Read",
    loading: "Reading…",
    text: "String",
    updateText: "Update text draft",
    characters: "Special characters",
    bytes: "Raw bytes",
    offset: "Byte offset",
    value: "Hexadecimal value",
    updateByte: "Update byte draft",
    species: "Species",
    language: "Language",
    generation: "Generation",
    layer: "Name layer",
    applyLayer: "Apply name layer",
    clear: "Clear trailing bytes",
    preview: "Preview changes",
    confirm: "Apply changes",
    cancel: "Cancel preview",
    reset: "Discard draft",
    stored: "Stored value",
    draft: "Current draft",
    before: "Before",
    after: "After",
    changed: "Changed bytes",
    none: "No byte changes",
    readonly: "This data is read-only",
    failed: "Name editing failed. Check the input or read again.",
    pendingInput: "Update the text or byte draft first.",
    note: "Encoding, layers and tail clearing follow the original window. Opening normalization also appears in the preview. Applying updates only the working copy.",
    empty: "This field has no byte buffer.",
  },
  ja: {
    title: "名前と元のバイト",
    nickname: "ニックネーム",
    originalTrainer: "親の名前",
    handlingTrainer: "引き取ったトレーナー名",
    field: "名前の項目",
    read: "読み込む",
    loading: "読み込み中…",
    text: "文字列",
    updateText: "文字の下書きを更新",
    characters: "特殊文字",
    bytes: "元のバイト",
    offset: "バイト位置",
    value: "16進数の値",
    updateByte: "バイトの下書きを更新",
    species: "種類",
    language: "言語",
    generation: "世代",
    layer: "名前レイヤー",
    applyLayer: "名前レイヤーを重ねる",
    clear: "末尾のバイトを消去",
    preview: "変更を確認",
    confirm: "変更を適用",
    cancel: "確認をキャンセル",
    reset: "下書きを破棄",
    stored: "元の値",
    draft: "現在の下書き",
    before: "変更前",
    after: "変更後",
    changed: "変更バイト",
    none: "バイトの変更はありません",
    readonly: "このデータは読み取り専用です",
    failed:
      "名前の編集に失敗しました。入力を確認するか再読み込みしてください。",
    pendingInput: "文字またはバイトの下書きを先に更新してください。",
    note: "文字の変換、レイヤー、末尾の消去は元の画面に従います。読み込み時の正規化も確認画面に表示します。適用は作業用コピーだけを更新します。",
    empty: "この項目にはバイト領域がありません。",
  },
} as const;

// Text.cs character comments identify these glyphs; labels avoid invisible PUA buttons.
export function textTrashCharacterLabel(
  code: number,
  generation: number,
  lang: "zh" | "en" | "ja",
) {
  const base =
    code >= 0xe081 && code <= 0xe0a5
      ? 0xe081
      : code >= 0x2460 && code <= 0x2484
        ? 0x2460
        : undefined;
  if (base === undefined) return String.fromCharCode(code);
  const index = code - base;
  if (index === 7) return "×";
  if (index === 8) return "÷";
  if (index >= 12 && index <= 29) return "…♂♀♠♣♥♦★◎○□△◇♪☀☁☂☃"[index - 12];
  const names = {
    zh: ["平静", "开心", "难过", "生气", "右上箭头", "右下箭头", "瞌睡"],
    en: ["Neutral", "Happy", "Sad", "Angry", "Up-right", "Down-right", "Zz"],
    ja: ["平常", "笑顔", "悲しい", "怒り", "右上矢印", "右下矢印", "眠り"],
  };
  let position = index < 7 ? index : index - 30;
  if (index < 7 && generation === 7)
    position =
      position === 0 ? 1 : position === 1 ? 3 : position === 3 ? 0 : position;
  const prefix =
    lang === "zh"
      ? index < 7
        ? "全宽"
        : "半宽"
      : lang === "ja"
        ? index < 7
          ? "全角"
          : "半角"
        : index < 7
          ? "Full "
          : "Half ";
  return position >= 0 && position < 7
    ? prefix + names[lang][position]
    : `U+${code.toString(16).toUpperCase()}`;
}
