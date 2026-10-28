// SPDX-License-Identifier: GPL-3.0-or-later
// Names/descriptions derived from PKHeX 26.08.26 WinForms lang files.
import source from "./settings-labels.json";
import type { SaveSettingsField } from "./settingsProtocol";
import { settingsCaptionFallback } from "./settingsCaptionFallbacks";
type Language = "zh" | "en" | "ja";
const labels: Readonly<Record<string, Record<Language, string | null>>> =
  source;
const keys = new Map(
  Object.keys(labels).map((key) => [key.toLowerCase(), key]),
);
function text(
  prefix: string,
  name: string,
  language: Language,
  fallback?: string,
) {
  const key = keys.get((prefix + "." + name).toLowerCase());
  return key
    ? (labels[key][language] ?? fallback ?? labels[key].en ?? name)
    : (fallback ?? name);
}
export const settingsFieldName = (name: string, lang: Language) =>
  text("PropertyGrid", name, lang);
export function settingsFieldCaption(field: SaveSettingsField, lang: Language) {
  // SettingsEditor exposes this Browsable(false) property through CB_Blank.
  if (field.path === "startup.defaultSaveVersion")
    return text("SettingsEditor", "L_Blank", lang);
  const path = field.path.split(".");
  const parents = path.slice(1, -1).map((name, index) => {
    const title = name[0].toUpperCase() + name.slice(1);
    return text(
      "PropertyGrid",
      title,
      lang,
      settingsCaptionFallback(path.slice(0, index + 2).join("."), lang),
    );
  });
  return [
    ...parents,
    text(
      "PropertyGrid",
      field.name,
      lang,
      settingsCaptionFallback(field.path, lang),
    ),
  ].join(" · ");
}
// StartupSettings hides these automatic values from its property grid. Keep
// their serialized data; do not apply leaf visibility to top-level groups.
export const settingsFieldVisible = (path: string) =>
  !["startup.version", "startup.recentlyLoaded", "startup.language"].includes(
    path,
  );
export const settingsGroupName = (name: string, lang: Language) =>
  text("SettingsEditor", name, lang);
export const settingsEnumName = (
  type: string | undefined | null,
  name: string,
  lang: Language,
) => (type ? text(type, name, lang) : name);
export const settingsFieldDescription = (name: string, lang: Language) => {
  const value = text("LocalizedDescription", name, lang);
  return value === name ? "" : value;
};
export const settingsWords = {
  zh: {
    title: "存档工具设置",
    group: "设置分组",
    save: "保存设置",
    reset: "恢复默认草稿",
    check: "核对保存结果",
    changed:
      "更改编辑相关设置会清除未应用的草稿与预览；导出选项不清除草稿，工作副本及撤销记录会保留。",
    invalid: "设置值无效，请检查输入内容。",
    loading: "正在读取设置…",
    loadError: "无法读取设置。已保存的设置未改动。",
    reload: "重新读取设置",
    saveError: "未能保存设置，请重新读取后再试。",
    pending: "此选项的网页行为尚待接入，当前不可修改。",
    list: "每行一项",
    changes: "保存后的设置变化",
    same: "没有设置变化",
    yes: "启用",
    no: "关闭",
  },
  en: {
    title: "Save tool settings",
    group: "Settings group",
    save: "Save settings",
    reset: "Reset draft to defaults",
    check: "Review saved values",
    changed:
      "Changes to editing settings clear unapplied drafts and previews. Export options preserve drafts. Working copies and undo history are preserved.",
    invalid: "Invalid settings. Check the entered values.",
    loading: "Loading settings…",
    loadError: "Could not read settings. Saved settings are unchanged.",
    reload: "Reload settings",
    saveError: "Could not save settings. Reload before trying again.",
    pending: "This option's web behavior is pending and cannot be changed yet.",
    list: "One item per line",
    changes: "Settings changes after saving",
    same: "No settings changes",
    yes: "Enabled",
    no: "Disabled",
  },
  ja: {
    title: "セーブツールの設定",
    group: "設定グループ",
    save: "設定を保存",
    reset: "下書きを初期値に戻す",
    check: "保存結果を確認",
    changed:
      "編集に関する設定の変更で未適用の下書きとプレビューは消去されます。書き出し設定は下書きを消去しません。作業コピーと元に戻す履歴は保持されます。",
    invalid: "設定値が無効です。項目を確認してください。",
    loading: "設定を読み込み中…",
    reload: "設定を再読み込み",
    loadError:
      "設定を読み込めませんでした。保存済みの設定は変更されていません。",
    saveError: "設定を保存できませんでした。再読み込みしてからお試しください。",
    pending: "この項目のウェブ動作は未実装のため、現在は変更できません。",
    list: "1行に1項目",
    changes: "保存後の設定変更",
    same: "設定の変更はありません",
    yes: "有効",
    no: "無効",
  },
};
