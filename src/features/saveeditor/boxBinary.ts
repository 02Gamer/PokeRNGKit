import type { BoxImportTicket } from "./boxImport";

export interface BoxBinaryTicket {
  token: string;
  summary: BoxImportTicket["summary"];
}

export interface BoxBinaryOptions {
  box: number;
  all: boolean;
  updateToSaveFile: number;
  updatePokeDex: number;
  updateRecord: number;
}

export const boxBinaryWords = {
  zh: {
    title: "整箱数据导入／导出",
    note: "按原格位替换当前箱子或全部箱子，空位也会覆盖。箱名和壁纸保留；文件须与当前存档格式相符。受保护格位或损坏数据会使整次替换停止。",
    scope: "范围",
    scopes: ["当前箱子", "全部箱子"],
    download: "导出箱子数据",
    downloaded: "已发起下载",
    choose: "选择箱子数据文件",
    preview: "预览整箱替换",
    limit: "单个文件，不超过 32 MiB；文件长度必须与所选范围一致。",
    source: "文件格位",
    error:
      "整箱操作未完成。请检查文件格式、范围、保护格位及数据校验；存档变化后需要重新预览。",
  },
  en: {
    title: "Box data import / export",
    note: "Replace the current box or all boxes at the original positions, including empty slots. Box names and wallpapers stay unchanged. The file must match the current save format. Protected slots or damaged data stop the entire replacement.",
    scope: "Scope",
    scopes: ["Current box", "All boxes"],
    download: "Export box data",
    downloaded: "Download started",
    choose: "Choose box data file",
    preview: "Preview box replacement",
    limit: "One file, up to 32 MiB; its length must match the selected scope.",
    source: "File slot",
    error:
      "Box operation could not finish. Check the file format, scope, protected slots and data checksums. Create a new preview after the save changes.",
  },
  ja: {
    title: "ボックスデータの読み込み／書き出し",
    note: "現在のボックスまたは全ボックスを元の位置のまま置換します。空き枠も上書きします。ボックス名と壁紙は保持されます。現在のセーブ形式に対応するファイルを選んでください。保護された枠や破損データがある場合は置換全体を中止します。",
    scope: "対象",
    scopes: ["現在のボックス", "全ボックス"],
    download: "ボックスデータを書き出す",
    downloaded: "ダウンロードを開始しました",
    choose: "ボックスデータを選択",
    preview: "ボックス置換をプレビュー",
    limit:
      "ファイルは 1 個、最大 32 MiB。サイズは対象範囲と一致する必要があります。",
    source: "ファイル内の枠",
    error:
      "ボックス操作を完了できませんでした。ファイル形式、対象範囲、保護された枠、チェックサムを確認してください。セーブ変更後はプレビューを作り直してください。",
  },
};
