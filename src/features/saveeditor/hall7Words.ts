import type { Br4Lang } from "./br4";
const en = {
  title: "Generation VII Hall of Fame",
  first: "First",
  current: "Latest",
  species: "Species",
  ec: "Starter Pokémon encryption constant",
  read: "Read Hall of Fame",
  preview: "Preview changes",
  apply: "Apply to working copy",
  cancel: "Discard changes",
  resave: "Save using source window rules",
  changed: "Changed bytes",
  empty: "Empty",
  unknown: "Unknown stored species",
  invalid:
    "The Hall of Fame edit is invalid or unavailable. No changes were applied.",
  stale:
    "This preview belongs to an older working copy. Read the current data and preview again.",
  note: "These records contain only species. The images show each species, without recorded form, gender, nickname or shininess. Ordinary edits preserve untouched values.",
  resaveNote:
    "Resaving replaces species missing from the source candidate list with empty slots. Review the preview before applying.",
  ecNote:
    "At most eight characters. The source parser skips characters outside 0–9/A–F; an empty value saves zero.",
  draftNote: "Apply or discard the draft before resaving.",
};
export const hall7Words: Record<Br4Lang, typeof en> = {
  en,
  zh: {
    title: "第七世代殿堂",
    first: "首次",
    current: "最新",
    species: "宝可梦种类",
    ec: "初始宝可梦加密常数",
    read: "读取殿堂记录",
    preview: "预览修改",
    apply: "应用到工作副本",
    cancel: "放弃修改",
    resave: "按原窗口规则重新保存",
    changed: "修改字节数",
    empty: "空位",
    unknown: "未知原始种类",
    invalid: "殿堂修改无效或不可用。没有应用修改。",
    stale: "此预览来自旧的工作副本。请重新读取并预览。",
    note: "记录只保存种类。图像代表该种类，不代表记录中存在形态、性别、昵称或异色信息。普通编辑保留未修改的数据。",
    resaveNote:
      "重新保存会把不在原窗口候选列表中的种类归为空位，请先查看预览再应用。",
    ecNote: "最多八个字符。原窗口解析会跳过 0–9/A–F 之外的字符；空值保存为零。",
    draftNote: "请先应用或放弃草稿，再重新保存。",
  },
  ja: {
    title: "第七世代の殿堂入り",
    first: "1回目",
    current: "最新",
    species: "ポケモンの種類",
    ec: "最初のポケモンの暗号化定数",
    read: "殿堂入り記録を読む",
    preview: "変更をプレビュー",
    apply: "作業コピーに適用",
    cancel: "変更を破棄",
    resave: "元の画面の規則で再保存",
    changed: "変更バイト数",
    empty: "空き",
    unknown: "不明な保存種族",
    invalid: "殿堂入りの変更が無効か利用できません。変更は適用されていません。",
    stale:
      "このプレビューは古い作業コピーのものです。読み直して再確認してください。",
    note: "記録は種類のみです。画像は種類の表示であり、フォルム・性別・ニックネーム・色違いの記録ではありません。通常の編集は未変更の値を保持します。",
    resaveNote:
      "再保存は元の候補リストにない種類を空きにします。適用前にプレビューを確認してください。",
    ecNote:
      "最大8文字。元の解析は 0–9/A–F 以外を無視し、空欄はゼロになります。",
    draftNote: "再保存の前に変更を適用するか破棄してください。",
  },
};
