// SPDX-License-Identifier: GPL-3.0-or-later
import type { OriginChoice } from "./domain";
import type { SaveDetectionChoice } from "./saveDetection";
export interface EntityTemplateSource {
  bytes: Uint8Array;
  recognition?: SaveDetectionChoice;
  brProfile?: number;
}
export interface EntityTemplateCatalog {
  apiVersion: 184;
  sourceHash: string;
  version: number;
  versions: OriginChoice[];
  directory: string;
  expectedFileName: string;
  format: string;
}
export interface EntityTemplateCreated {
  apiVersion: 184;
  sourceHash: string;
  version: number;
  directory: string;
  expectedFileName: string;
  usedCustom: boolean;
  fallback: "none" | "name" | "size" | "unrecognized" | "conversion";
  fileName: string;
}
export interface EntityTemplateQuery {
  version: number;
  templateName?: string;
  templateData?: string;
}
export function parseEntityTemplateCatalog(
  value: unknown,
  sourceHash: string,
): EntityTemplateCatalog {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Missing template catalog.");
  const v = value as EntityTemplateCatalog;
  if (
    v.apiVersion !== 184 ||
    v.sourceHash !== sourceHash ||
    !/^[A-F0-9]{64}$/.test(sourceHash) ||
    !Number.isInteger(v.version) ||
    !Array.isArray(v.versions) ||
    !v.versions.some((c) => c.id === v.version) ||
    !v.versions.every(
      (c) =>
        Number.isInteger(c.id) &&
        c.name &&
        ["zh", "en", "ja"].every(
          (l) => typeof c.name[l as keyof typeof c.name] === "string",
        ),
    ) ||
    typeof v.directory !== "string" ||
    !v.directory ||
    v.directory.length > 32767 ||
    typeof v.expectedFileName !== "string" ||
    !v.expectedFileName ||
    v.expectedFileName.length > 32784 ||
    typeof v.format !== "string" ||
    !v.format
  )
    throw new Error("Template catalog source or shape mismatch.");
  return v;
}
export function parseEntityTemplateCreated(
  value: unknown,
  sourceHash: string,
): EntityTemplateCreated {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Missing created template.");
  const v = value as EntityTemplateCreated;
  if (
    v.apiVersion !== 184 ||
    v.sourceHash !== sourceHash ||
    !/^[A-F0-9]{64}$/.test(sourceHash) ||
    !Number.isInteger(v.version) ||
    typeof v.directory !== "string" ||
    !v.directory ||
    typeof v.expectedFileName !== "string" ||
    !v.expectedFileName ||
    typeof v.usedCustom !== "boolean" ||
    !["none", "name", "size", "unrecognized", "conversion"].includes(
      v.fallback,
    ) ||
    typeof v.fileName !== "string" ||
    !/^template\.(pk[1-9]|sk2|rk4|[cxb]k[34]|p[ba][789])$/.test(v.fileName)
  )
    throw new Error("Created template source or shape mismatch.");
  return v;
}
export function entityTemplateBase64(bytes: Uint8Array) {
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
}
export const entityTemplateWords = {
  zh: {
    title: "宝可梦模板",
    version: "游戏版本",
    defaultVersion: "使用默认版本",
    context: "参考当前存档语言",
    directory: "本机模板分类",
    expected: "模板文件名",
    create: "创建并编辑",
    load: "读取模板",
    store: "导入为当前格式模板",
    remove: "移除模板",
    undo: "撤销模板更改",
    none: "尚未设置自定义模板，将使用 Core 默认字段。",
    note: "创建独立宝可梦工作副本，不会生成新的游戏存档。默认字段用于编辑，初始化版本遵循 Core 的版本组规则，以编辑器显示为准；生成后可继续检查相遇信息与合法性。",
    languageNote:
      "参考存档只影响上游默认语言规则，模板训练家仍采用 PKHeX 的默认身份。",
    libraryError: "本机模板库不可用，本次使用默认字段。",
    stored: "模板已保存到本机分类。",
    removed: "模板已移除，可撤销。",
    undone: "已撤销模板更改。",
    failed: "操作未完成，请重新读取后重试。",
    loading: "正在读取模板…",
    invalid: "文件无法用作当前格式的模板，原模板未改动。",
    custom: "已使用自定义模板创建工作副本。",
    fallback: "已使用 Core 默认模板字段创建工作副本。",
    close: "关闭此模板编辑器",
    closeNote: "关闭将丢弃此编辑器中尚未导出的更改。",
    confirmClose: "关闭并丢弃更改",
    cancel: "取消",
  },
  en: {
    title: "Pokémon templates",
    version: "Game version",
    defaultVersion: "Use default version",
    context: "Use current save language",
    directory: "Local template category",
    expected: "Template file name",
    create: "Create and edit",
    load: "Read templates",
    store: "Import as template for this format",
    remove: "Remove template",
    undo: "Undo template change",
    none: "No custom template is set. Core defaults will be used.",
    note: "Create an independent Pokémon working copy. This does not create a new game save. The initial version follows Core version-group rules; use the value shown in the editor. Continue editing and check encounter details and legality after creation.",
    languageNote:
      "The save supplies the source's default language rules. Template trainer details still use PKHeX defaults.",
    libraryError:
      "Local template storage is unavailable. Core defaults will be used.",
    stored: "Template saved to the local category.",
    removed: "Template removed. Undo is available.",
    undone: "Template change undone.",
    failed: "The operation did not finish. Reload and retry.",
    loading: "Reading templates…",
    invalid:
      "The file cannot be used as a template for this format. The existing template is unchanged.",
    custom: "Working copy created from the custom template.",
    fallback: "Working copy created using Core template defaults.",
    close: "Close this template editor",
    closeNote:
      "Closing discards changes that have not been exported from this editor.",
    confirmClose: "Close and discard changes",
    cancel: "Cancel",
  },
  ja: {
    title: "ポケモンテンプレート",
    version: "ゲームバージョン",
    defaultVersion: "既定のバージョンを使用",
    context: "現在のセーブの言語を参照",
    directory: "ローカルのテンプレート分類",
    expected: "テンプレートファイル名",
    create: "作成して編集",
    load: "テンプレートを読む",
    store: "この形式のテンプレートとして読み込む",
    remove: "テンプレートを削除",
    undo: "テンプレート変更を元に戻す",
    none: "カスタムテンプレートは未設定です。Core の既定値を使用します。",
    note: "単体ポケモンの作業コピーを作成します。新しいゲームのセーブは作成しません。初期バージョンは Core のバージョングループ規則に従います。エディターの表示値を確認し、作成後も編集や出会い情報・合法性の確認ができます。",
    languageNote:
      "セーブからは上流の既定言語の規則だけを参照します。トレーナー情報は PKHeX の既定値です。",
    libraryError:
      "ローカルのテンプレート保存先を利用できません。Core の既定値を使用します。",
    stored: "テンプレートをローカル分類に保存しました。",
    removed: "テンプレートを削除しました。元に戻せます。",
    undone: "テンプレート変更を元に戻しました。",
    failed: "操作が完了しませんでした。再読み込みして試してください。",
    loading: "テンプレートを読み込み中…",
    invalid:
      "この形式のテンプレートとして使用できません。既存のテンプレートは変更されていません。",
    custom: "カスタムテンプレートから作業コピーを作成しました。",
    fallback: "Core の既定値で作業コピーを作成しました。",
    close: "このテンプレートエディターを閉じる",
    closeNote: "閉じると、このエディターで未出力の変更は破棄されます。",
    confirmClose: "閉じて変更を破棄",
    cancel: "キャンセル",
  },
} as const;
