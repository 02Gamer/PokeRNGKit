export interface BoxArchiveRequest {
  box: number;
  all: boolean;
  folderMode: number;
  folderNaming: number;
  emptySlots: number;
  indexPrefix: number;
}

export const boxArchiveWords = {
  zh: {
    title: "导出箱子",
    note: "导出已应用的箱子数据，按原格式生成宝可梦文件并下载 ZIP 副本。同名文件自动加后缀。",
    scope: "范围",
    scopes: ["当前箱子", "全部箱子"],
    folders: "目录",
    folderModes: ["放在同一目录", "每个箱子一个目录"],
    naming: "目录名称",
    names: ["箱子名称", "箱子编号", "编号和名称"],
    prefix: "文件编号前缀",
    prefixes: [
      "无",
      "箱内格位（从 0 开始）",
      "全箱格位（从 0 开始）",
      "箱号和格位",
    ],
    include: "包含空格和无效实体",
    includeNote:
      "沿用 PKHeX 导出行为：补齐所需队伍数据并重新计算实体校验；不会修复合法性，也不修改存档。",
    download: "下载箱子 ZIP",
    downloaded: "已请求下载箱子 ZIP 副本。",
    error: "箱子导出失败，请检查范围、存档校验和实体数据。原存档未改变。",
    empty: "所选范围没有可导出的宝可梦。",
  },
  en: {
    title: "Export boxes",
    note: "Export applied box data as native Pokémon files in a ZIP copy. Duplicate names receive a suffix.",
    scope: "Scope",
    scopes: ["Current box", "All boxes"],
    folders: "Folders",
    folderModes: ["One directory", "One directory per box"],
    naming: "Folder names",
    names: ["Box name", "Box number", "Number and name"],
    prefix: "File index prefix",
    prefixes: [
      "None",
      "Slot in box (from 0)",
      "Slot in all boxes (from 0)",
      "Box and slot",
    ],
    include: "Include empty and invalid entities",
    includeNote:
      "Follows PKHeX export behavior: fills required party data and recalculates entity checksums. Does not repair legality or modify the save.",
    download: "Download box ZIP",
    downloaded: "Box ZIP copy download requested.",
    error:
      "Box export failed. Check the scope, save checksums and entity data. The original save is unchanged.",
    empty: "No eligible Pokémon in the selected scope.",
  },
  ja: {
    title: "ボックスを書き出す",
    note: "適用済みのボックスデータを元の形式のポケモンファイルとして ZIP に書き出します。同名ファイルには接尾辞を付けます。",
    scope: "範囲",
    scopes: ["現在のボックス", "すべてのボックス"],
    folders: "フォルダー",
    folderModes: ["同じフォルダー", "ボックスごとのフォルダー"],
    naming: "フォルダー名",
    names: ["ボックス名", "ボックス番号", "番号と名前"],
    prefix: "ファイル番号の接頭辞",
    prefixes: [
      "なし",
      "ボックス内の位置（0 から）",
      "全ボックス内の位置（0 から）",
      "ボックス番号と位置",
    ],
    include: "空き枠と無効なデータを含める",
    includeNote:
      "PKHeX と同様に、必要な手持ちデータを補いチェックサムを再計算します。合法性の修復やセーブの変更は行いません。",
    download: "ボックスの ZIP をダウンロード",
    downloaded: "ボックスの ZIP コピーのダウンロードを要求しました。",
    error:
      "ボックスを書き出せませんでした。範囲、セーブのチェックサム、ポケモンのデータを確認してください。元のセーブは変更されていません。",
    empty: "選択した範囲に書き出せるポケモンがいません。",
  },
};
