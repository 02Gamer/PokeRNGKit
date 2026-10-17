// SPDX-License-Identifier: GPL-3.0-or-later
import { encounterWords } from "./encounterWords";
export const trainerLibraryWords = {
  zh: {
    title: "本机训练家资料",
    note: `从宝可梦文件读取原训练家信息，按游戏版本用于相遇生成。目录包含已导入的子分类；导入后点击“${encounterWords.zh.save}”。同名文件需先移除再导入，原文件保持不变。`,
    folder: "导入目录",
    files: "导入宝可梦文件",
    directory: "资料分类",
    reload: "重新读取",
    remove: "移除",
    undo: "撤销资料变更",
    saved: `资料已更新，请点击“${encounterWords.zh.save}”后再生成。`,
    failed: "本机训练家资料不可用。可重新读取或移除重名文件后再导入。",
    unavailable: "未读取到本机训练家资料，本次仅使用手动来源或当前存档。",
    empty: "此分类没有宝可梦文件。",
    count: "已从文件注册的训练家",
  },
  en: {
    title: "Local trainer library",
    note: `Read original trainers from Pokémon files for encounter generation by game version. Imported subcategories are included. Click “${encounterWords.en.save}” after importing. Remove an existing file before replacing it; original files are preserved.`,
    folder: "Import folder",
    files: "Import Pokémon files",
    directory: "Library category",
    reload: "Reload",
    remove: "Remove",
    undo: "Undo library change",
    saved: `Library updated. Click “${encounterWords.en.save}” before generating.`,
    failed:
      "The local trainer library is unavailable. Reload, or remove duplicate files before importing again.",
    unavailable:
      "The local trainer library was not loaded. This session uses manual sources or the current save.",
    empty: "No Pokémon files in this category.",
    count: "Trainers registered from files",
  },
  ja: {
    title: "ローカルトレーナー資料",
    note: `ポケモンファイルの元のトレーナー情報をゲーム別の出会い生成に使用します。取り込み済みの子分類も含みます。取り込み後に「${encounterWords.ja.save}」を選択してください。同名ファイルは削除してから置き換えます。元ファイルは変更しません。`,
    folder: "フォルダーを取り込む",
    files: "ポケモンを取り込む",
    directory: "資料の分類",
    reload: "再読み込み",
    remove: "削除",
    undo: "資料の変更を元に戻す",
    saved: `資料を更新しました。生成前に「${encounterWords.ja.save}」を選択してください。`,
    failed:
      "ローカル資料を読めません。再読み込みするか、重複ファイルを削除してから取り込んでください。",
    unavailable:
      "ローカル資料を読み込めませんでした。手動の情報源または現在のセーブを使用します。",
    empty: "この分類にポケモンファイルはありません。",
    count: "ファイルから登録したトレーナー",
  },
};
