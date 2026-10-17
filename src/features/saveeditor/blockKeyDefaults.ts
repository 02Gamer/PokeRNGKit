// SPDX-License-Identifier: GPL-3.0-or-later
import { loadBlockKeyLibrary, findBlockKeyFile } from "./blockKeyLibrary";
import {
  blockKeyFileName,
  programAdvancedSettings,
} from "./programAdvancedSettings";
export async function blockKeyDefaults(
  format: string,
  flags: boolean,
  json: string,
) {
  const settings = programAdvancedSettings(json);
  const fileName = blockKeyFileName(format, flags);
  try {
    const library = await loadBlockKeyLibrary();
    const file = findBlockKeyFile(library, settings.directory, [fileName]);
    return {
      names: file ? await file.data.text() : "",
      exclusions: settings.exclusions,
      failed: false,
    };
  } catch {
    return { names: "", exclusions: settings.exclusions, failed: true };
  }
}
export const blockKeyWords = {
  zh: {
    title: "区块名称资料",
    note: "将选择的 TXT 文件保存到当前配置的本机分类。按存档类型文件名匹配；Z-A 事件使用 _flagwork 后缀。不会扫描电脑目录。",
    files: "导入 TXT",
    folder: "导入目录",
    remove: "移除",
    undo: "撤销资料变更",
    reload: "重新读取",
    failed: "本机名称资料不可用，可重新读取或在区块工具中手动导入。",
    saved: "本机名称资料已更新。",
    empty: "此分类尚无名称文件。",
    loaded: "名称目录",
  },
  en: {
    title: "Local block names",
    note: "Store selected TXT files in the configured local category. Match the save type name; Z-A events use the _flagwork suffix. Computer folders are not scanned.",
    files: "Import TXT",
    folder: "Import folder",
    remove: "Remove",
    undo: "Undo library change",
    reload: "Reload",
    failed:
      "Local names are unavailable. Reload or import names manually in the block tools.",
    saved: "Local names updated.",
    empty: "No name files in this category.",
    loaded: "Name folder",
  },
  ja: {
    title: "ローカルのブロック名",
    note: "選択した TXT を設定済みのローカル分類に保存します。セーブ形式名で照合し、Z-A のイベントは _flagwork を使用します。PC のフォルダーは走査しません。",
    files: "TXT を取り込む",
    folder: "フォルダーを取り込む",
    remove: "削除",
    undo: "資料の変更を元に戻す",
    reload: "再読み込み",
    failed:
      "ローカルの名前資料を読めません。再読み込みするか、ブロック画面で手動で取り込んでください。",
    saved: "ローカルの名前資料を更新しました。",
    empty: "この分類に名前ファイルはありません。",
    loaded: "名前フォルダー",
  },
};
