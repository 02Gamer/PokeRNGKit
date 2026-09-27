import type { PropertyBatchConfirmation } from "./propertyBatch";
export type FileBatchConfirmation = PropertyBatchConfirmation;
export interface FileBatchTicket {
  token: string;
  summary: {
    groups: number;
    filters: number;
    instructions: number;
    exportedFiles: number;
    ignoredLines: number[];
    emptyValues: boolean;
    files: {
      path: string;
      format: string | null;
      status: string;
      inputSize: number;
      outputSize: number;
      outcomes: { group: number; result: string; error: boolean }[];
    }[];
  };
}
export const FILE_BATCH_LIMITS = {
  files: 10000,
  bytes: 64 * 1024 * 1024,
  pathCharacters: 4 * 1024 * 1024,
  instructionCharacters: 1000000,
};
export function validateBatchFiles(
  files: readonly Pick<File, "name" | "size" | "webkitRelativePath">[],
) {
  if (
    !files.length ||
    files.length > FILE_BATCH_LIMITS.files ||
    files.some((f) => !Number.isSafeInteger(f.size) || f.size < 0) ||
    files.reduce((total, f) => total + f.size, 0) > FILE_BATCH_LIMITS.bytes ||
    files.reduce(
      (total, f) => total + (f.webkitRelativePath || f.name).length,
      0,
    ) > FILE_BATCH_LIMITS.pathCharacters
  )
    throw new Error("File batch input exceeds preview limits.");
}
export async function readBatchFiles(
  files: readonly File[],
  current: () => boolean,
) {
  validateBatchFiles(files);
  const result: { path: string; data: string }[] = [];
  for (const file of files) {
    if (!current()) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!current()) return;
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    result.push({
      path: file.webkitRelativePath || file.name,
      data: btoa(binary),
    });
  }
  return result;
}
export function fileBatchHasErrors(ticket: FileBatchTicket) {
  return ticket.summary.files.some(
    (f) =>
      ["unrecognized", "formatConflict", "invalid", "exportFailed"].includes(
        f.status,
      ) || f.outcomes.some((o) => o.error),
  );
}
export const fileBatchWords = {
  zh: {
    title: "文件批量编辑",
    files: "选择文件",
    directory: "选择目录",
    selected: "已选文件",
    clear: "清除选择",
    format: "文件格式",
    catalogFormat: "属性目录格式",
    path: "相对路径",
    download: "下载 ZIP 副本",
    exported: "可导出文件",
    details: "逐组结果",
    downloaded: "已请求下载 ZIP 副本",
    note: "选择宝可梦文件或目录，先预览再下载。原文件与当前存档不会改变；ZIP 保留相对目录，仅包含成功处理的文件。每批最多 10000 个文件、合计 64 MiB。文件的格位筛选为 1，没有箱号。",
    error:
      "文件批量处理未能完成。请检查文件、指令和路径，或重新生成预览；原文件与存档未改变。",
    limits: "文件数量、大小或指令超出预览上限，请分批处理。",
    paths: "文件路径重复、含不支持的字符或与目录冲突，请重新选择或分批处理。",
    states: {
      exported: "可导出",
      notExported: "未产生输出",
      unrecognized: "无法识别",
      formatConflict: "扩展名与格式冲突",
      invalid: "数据无效",
      empty: "空宝可梦",
      exportFailed: "输出校验失败",
      modified: "已处理",
      filtered: "不匹配",
      matched: "匹配",
      skipped: "已跳过",
    },
  },
  en: {
    title: "File batch editor",
    files: "Select files",
    directory: "Select directory",
    selected: "Selected files",
    clear: "Clear selection",
    format: "File format",
    catalogFormat: "Property catalog format",
    path: "Relative path",
    download: "Download ZIP copy",
    exported: "Exportable files",
    details: "Group results",
    downloaded: "ZIP copy download requested",
    note: "Select Pokémon files or a directory, preview, then download. Original files and the current save stay unchanged. The ZIP preserves relative directories and contains only successfully processed files. Limit: 10,000 files and 64 MiB per batch. File slot filters use 1; files have no box number.",
    error:
      "File batch processing could not finish. Check files, instructions and paths, or create a new preview. Original files and the save are unchanged.",
    limits:
      "Files, size or instructions exceed the preview limit. Process smaller batches.",
    paths:
      "File paths collide, contain unsupported characters or conflict with directories. Select different files or split the batch.",
    states: {
      exported: "Exportable",
      notExported: "No output",
      unrecognized: "Unrecognized",
      formatConflict: "Extension/format conflict",
      invalid: "Invalid data",
      empty: "Empty Pokémon",
      exportFailed: "Output verification failed",
      modified: "Processed",
      filtered: "Not matched",
      matched: "Matched",
      skipped: "Skipped",
    },
  },
  ja: {
    title: "ファイル一括編集",
    files: "ファイルを選択",
    directory: "フォルダーを選択",
    selected: "選択したファイル",
    clear: "選択を解除",
    format: "ファイル形式",
    catalogFormat: "プロパティ一覧の形式",
    path: "相対パス",
    download: "ZIPコピーをダウンロード",
    exported: "出力可能なファイル",
    details: "グループ別の結果",
    downloaded: "ZIPコピーのダウンロードを要求しました",
    note: "ポケモンのファイルまたはフォルダーを選び、結果を確認してからダウンロードします。元ファイルと現在のセーブは変更しません。ZIPは相対フォルダー構造を保持し、処理できたファイルのみを含みます。1回につき10000ファイル、合計64 MiBまで。ファイルのスロット条件は1、ボックス番号はありません。",
    error:
      "ファイルの一括処理を完了できませんでした。ファイル、命令、パスを確認するか、プレビューを作り直してください。元ファイルとセーブは変更されていません。",
    limits:
      "ファイル数、サイズ、命令が上限を超えています。分割して処理してください。",
    paths:
      "パスの重複、使用できない文字、またはフォルダーとの競合があります。選択し直すか分割してください。",
    states: {
      exported: "出力可能",
      notExported: "出力なし",
      unrecognized: "認識できません",
      formatConflict: "拡張子と形式が不一致",
      invalid: "無効なデータ",
      empty: "空のポケモン",
      exportFailed: "出力の検証に失敗",
      modified: "処理済み",
      filtered: "不一致",
      matched: "一致",
      skipped: "スキップ",
    },
  },
};
