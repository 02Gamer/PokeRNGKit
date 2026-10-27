// SPDX-License-Identifier: GPL-3.0-or-later
import { SAVE_EDITOR_API_VERSION } from "./domain";

// Internal launch-history version: API + Web UI revision. This is independent
// of PKHeX's desktop version and does not introduce a product release number.
export const SAVE_STARTUP_RELEASE = {
  version: `0.${SAVE_EDITOR_API_VERSION}.4.0`,
  date: "2026-10-28",
  changes: {
    zh: [
      "统一存档表单的下拉禁用状态，保留各项只读与草稿限制。",
      "关闭箱子导出面板时记住选项，并保留未应用的编辑草稿。",
      "设置页隐藏自动维护的内部字段，并补齐空白存档版本的语言标签。",
      "仅修改昵称会保留宝可梦的个性值、异色和其他未编辑内容。",
      "更新背包说明，修正确认放入时的处理提示。",
      "接入启动画面与更新日志设置，可在启动设置中查看本次更新。",
    ],
    en: [
      "Unified disabled states for save-form menus while retaining read-only and draft restrictions.",
      "Closing box export remembers its options while preserving unapplied editing drafts.",
      "Settings hide automatically maintained internal fields and use localized blank-save version labels.",
      "Nickname-only edits preserve the Pokémon's PID, shininess and other unedited data.",
      "Updated inventory descriptions and corrected the pending indicator during slot confirmation.",
      "Connected splash-screen and changelog settings. Review these notes in Startup settings.",
    ],
    ja: [
      "セーブ編集フォームの選択メニューの無効状態を統一し、読み取り専用や編集中の制限を保持しました。",
      "ボックス書き出しパネルを閉じると設定を記憶し、未適用の編集内容は保持します。",
      "設定画面で自動管理の内部項目を非表示にし、空白セーブの種類のラベルを各言語に対応しました。",
      "ニックネームのみの変更では、性格値・色違い状態・未編集の内容を保持します。",
      "バッグの説明と、スロットに入れる際の処理表示を修正しました。",
      "起動画面と更新履歴の設定を接続しました。起動設定から今回の更新を確認できます。",
    ],
  },
} as const;
export const saveStartupWords = {
  zh: {
    starting: "正在启动存档工具",
    loading: "准备好后即可读取和编辑存档。",
    failed: "存档工具启动失败，请重试或检查存档工具设置。",
    cancelled: "启动已取消，可以重试。",
    retry: "重新启动存档工具",
    historyFailed: "无法保存本机更新记录，下次启动可能再次提示。",
    changelog: "存档工具更新日志",
    close: "关闭",
    scope:
      "这两个选项用于下次打开页面后首次进入存档工作区。启动画面只在实际初始化期间显示；更新日志仅在版本变新时自动显示，首次运行不弹出。",
    viewChangelog: "查看更新日志",
  },
  en: {
    starting: "Starting save tools",
    loading: "You can read and edit saves when initialization completes.",
    failed:
      "Save tools could not start. Retry or check the save tool settings.",
    cancelled: "Startup was cancelled. You can retry.",
    retry: "Restart save tools",
    historyFailed:
      "The local update record could not be saved. These notes may appear again next time.",
    changelog: "Save tools changelog",
    close: "Close",
    scope:
      "These two options apply when you first enter the save workspace after reopening the page. The splash screen appears only during initialization. Changelog notes appear automatically for a newer version, not on the first run.",
    viewChangelog: "View changelog",
  },
  ja: {
    starting: "セーブツールを起動中",
    loading: "初期化が完了するとセーブの読み取りと編集ができます。",
    failed:
      "セーブツールを起動できません。再試行するか、設定を確認してください。",
    cancelled: "起動をキャンセルしました。再試行できます。",
    retry: "セーブツールを再起動",
    historyFailed:
      "この端末に更新記録を保存できませんでした。次回も表示される場合があります。",
    changelog: "セーブツールの更新履歴",
    close: "閉じる",
    scope:
      "この2項目は、ページを開き直して最初にセーブ作業画面へ入るときに適用されます。起動画面は初期化中のみ表示されます。更新履歴は新しいバージョンで自動表示され、初回は表示されません。",
    viewChangelog: "更新履歴を表示",
  },
} as const;
