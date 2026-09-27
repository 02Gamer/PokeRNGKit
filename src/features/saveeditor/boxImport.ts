export interface BoxImportTicket {
  token: string;
  summary: {
    deleted: number;
    written: number;
    overwritten: number;
    outcomes: { source: number; box: number; slot: number; status: string }[];
  };
  sources: { file: number; entry: number }[];
  files: { file: number; path: string; status: string; entities: number }[];
}
export interface BoxImportConfirmation {
  token: string;
  allowClear: boolean;
  allowOverwrite: boolean;
  allowSkipped: boolean;
}
export interface BoxImportOptions {
  firstBox: number;
  clear: boolean;
  overwrite: boolean;
  updateToSaveFile: number;
  updatePokeDex: number;
  updateRecord: number;
}
export const boxImportWords = {
  zh: {
    title: "批量导入箱子",
    choose: "选择文件",
    folder: "选择文件夹",
    selected: "已选文件",
    note: "先预览，再应用到工作副本。支持宝可梦文件、实体礼物与成组文件；原存档保持不变，可撤销。",
    limits:
      "最多 10000 个文件、合计 64 MiB；展开后最多 10000 个宝可梦。文件夹包含所选目录的子目录。",
    start: "起始箱子",
    clear: "导入前清空起始箱子及其后所有箱子",
    overwrite: "允许覆盖已有格位",
    protection:
      "受保护格位会跳过；箱子文件按宝可梦顺序展开，不是原布局整箱替换。",
    settings: ["适配当前存档的训练家信息", "更新图鉴", "更新游戏记录"],
    choices: ["使用核心默认设置", "启用", "禁用"],
    preview: "生成导入预览",
    cancel: "取消预览",
    apply: "应用到工作副本",
    written: "写入",
    deleted: "删除",
    overwritten: "覆盖",
    confirmClear: "确认删除预览中列出的格位",
    confirmOverwrite: "确认覆盖预览中列出的格位",
    confirmSkipped: "确认跳过未能导入的文件或宝可梦",
    source: "来源文件 / 组内序号",
    position: "目标箱子 / 格位",
    result: "结果",
    previous: "上一页",
    next: "下一页",
    noChanges: "没有可应用的变化",
    unknown: "未知结果",
    error: "导入未完成。请检查预览、所选文件和确认项；存档变化后需要重新预览。",
    states: {
      ready: "已解析",
      written: "写入",
      deleted: "删除",
      overwritten: "覆盖",
      protected: "跳过保护格位",
      invalid: "数据校验失败",
      incompatible: "不兼容当前存档",
      full: "箱子容量不足",
      unrecognized: "无法识别文件",
      unsupported: "文件不含可导入的宝可梦",
      formatConflict: "扩展名与格式不符",
      decodeFailed: "解析失败",
      empty: "没有可导入条目",
    },
  },
  en: {
    title: "Import files into boxes",
    choose: "Choose files",
    folder: "Choose folder",
    selected: "Selected files",
    note: "Preview before applying to the working copy. Supports Pokémon files, entity gifts and groups. The original save stays unchanged; imports can be undone.",
    limits:
      "Up to 10,000 files, 64 MiB total and 10,000 expanded Pokémon. Folder selection includes subfolders.",
    start: "Starting box",
    clear: "Clear the starting box and all following boxes first",
    overwrite: "Allow occupied slots to be overwritten",
    protection:
      "Protected slots are skipped. Box files expand into Pokémon in order; this does not replace the original box layout.",
    settings: [
      "Adapt trainer details to this save",
      "Update Pokédex",
      "Update game records",
    ],
    choices: ["Use core defaults", "Enable", "Disable"],
    preview: "Preview import",
    cancel: "Discard preview",
    apply: "Apply to working copy",
    written: "Written",
    deleted: "Deleted",
    overwritten: "Overwritten",
    confirmClear: "Confirm deletion of the listed slots",
    confirmOverwrite: "Confirm overwriting the listed slots",
    confirmSkipped:
      "Confirm skipping files or Pokémon that could not be imported",
    source: "Source file / member",
    position: "Target box / slot",
    result: "Result",
    previous: "Previous",
    next: "Next",
    noChanges: "No changes to apply",
    unknown: "Unknown result",
    error:
      "Import was not completed. Check the preview, selected files and confirmations. Preview again after the save changes.",
    states: {
      ready: "Decoded",
      written: "Written",
      deleted: "Deleted",
      overwritten: "Overwritten",
      protected: "Protected slot skipped",
      invalid: "Invalid data",
      incompatible: "Incompatible with this save",
      full: "No remaining capacity",
      unrecognized: "Unrecognized file",
      unsupported: "No importable Pokémon in this file",
      formatConflict: "Extension and format disagree",
      decodeFailed: "Decoding failed",
      empty: "No entries to import",
    },
  },
  ja: {
    title: "ボックスへ一括読み込み",
    choose: "ファイルを選択",
    folder: "フォルダーを選択",
    selected: "選択したファイル",
    note: "プレビュー後に作業用コピーへ適用します。ポケモン・ポケモン入りのふしぎなおくりもの・グループに対応。元のセーブは保持され、操作を元に戻せます。",
    limits:
      "最大10000ファイル、合計64 MiB、展開後10000匹。フォルダー選択にはサブフォルダーも含みます。",
    start: "開始ボックス",
    clear: "開始ボックス以降の全ボックスを先に空にする",
    overwrite: "使用中のスロットへの上書きを許可",
    protection:
      "保護スロットはスキップします。ボックスファイルはポケモンの順に展開され、元の配置をそのまま置換する操作ではありません。",
    settings: [
      "このセーブのトレーナー情報に適合",
      "図鑑を更新",
      "ゲーム記録を更新",
    ],
    choices: ["コアの既定値を使用", "有効", "無効"],
    preview: "読み込みをプレビュー",
    cancel: "プレビューを破棄",
    apply: "作業用コピーへ適用",
    written: "書き込み",
    deleted: "削除",
    overwritten: "上書き",
    confirmClear: "表示されたスロットの削除を確認",
    confirmOverwrite: "表示されたスロットの上書きを確認",
    confirmSkipped: "読み込めないファイルやポケモンのスキップを確認",
    source: "元ファイル / メンバー",
    position: "対象ボックス / スロット",
    result: "結果",
    previous: "前へ",
    next: "次へ",
    noChanges: "適用する変更はありません",
    unknown: "不明な結果",
    error:
      "読み込みは完了していません。プレビュー、ファイルと確認項目を見直してください。セーブ変更後は再プレビューが必要です。",
    states: {
      ready: "解析済み",
      written: "書き込み",
      deleted: "削除",
      overwritten: "上書き",
      protected: "保護スロットをスキップ",
      invalid: "データ検証失敗",
      incompatible: "このセーブに非対応",
      full: "空き容量なし",
      unrecognized: "ファイルを認識できません",
      unsupported: "読み込めるポケモンがありません",
      formatConflict: "拡張子と形式の不一致",
      decodeFailed: "解析失敗",
      empty: "読み込み対象なし",
    },
  },
};

export function boxImportHasSkipped(ticket: BoxImportTicket) {
  return (
    ticket.files.some((f) => f.status !== "ready") ||
    ticket.summary.outcomes.some((o) =>
      ["invalid", "incompatible", "full"].includes(o.status),
    )
  );
}
