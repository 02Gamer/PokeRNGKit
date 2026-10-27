// SPDX-License-Identifier: GPL-3.0-or-later
// Source: PKHeX Program, Main, SAVEditor, WinFormsUtil and StartupUtil.
const reasons = {
  zh: {
    theme: "网页主题使用顶部的主题设置，此项控制桌面程序的启动配色。",
    dpi: "此项控制桌面 DPI 渲染。网页显示比例使用浏览器缩放和系统显示设置。",
    plugins: "此项控制桌面 .NET 插件加载，静态网页不加载本机程序集。",
    recent:
      "网页使用文件选择器与本机资料库打开存档；此项用于桌面的磁盘最近文件检测。",
    backupPrompt:
      "此项记录桌面程序是否询问过创建备份目录；网页备份使用本机资料库。",
    extensions: "网页文件入口不按扩展名筛选，文件内容仍由 PKHeX 核心识别。",
    saveAs:
      "网页导出始终创建下载副本，原始文件不被覆盖。此项控制桌面的覆盖与另存对话框。",
    boxDrop:
      "此项控制 Windows 整箱临时文件拖出。网页整箱文件使用箱子二进制导出入口。",
    focus: "网页焦点使用统一控件样式，此项只调整桌面自绘焦点框的像素缩进。",
  },
  en: {
    theme:
      "Use the theme control in the page header. This option controls the desktop application's startup colors.",
    dpi: "This option controls desktop DPI rendering. Web scale follows browser zoom and system display settings.",
    plugins:
      "This option loads desktop .NET plugins. The static web app does not load local .NET assemblies.",
    recent:
      "Open web saves through the file picker or local library. This option detects recent files on desktop disks.",
    backupPrompt:
      "This records whether the desktop app asked to create a backup directory. Web backups use the local library.",
    extensions:
      "The save file picker does not filter extensions. PKHeX Core still identifies the file contents.",
    saveAs:
      "Web exports always download a copy and preserve the original file. This option controls desktop overwrite and Save As dialogs.",
    boxDrop:
      "This option drags temporary box files out of Windows. Use the box binary export command on the web.",
    focus:
      "Web focus follows the shared control styles. This option only indents custom desktop focus borders.",
  },
  ja: {
    theme:
      "ウェブの配色はページ上部のテーマ設定で変更します。この項目はデスクトップ版の起動時の配色を制御します。",
    dpi: "この項目はデスクトップの DPI 描画を制御します。ウェブの表示倍率はブラウザーのズームとシステムの表示設定に従います。",
    plugins:
      "この項目はデスクトップの .NET プラグインを読み込みます。静的ウェブ版はローカルのアセンブリを読み込みません。",
    recent:
      "ウェブではファイル選択またはローカルライブラリからセーブを開きます。この項目はデスクトップのディスク上の最近のファイルを検出します。",
    backupPrompt:
      "この項目はデスクトップ版でバックアップフォルダーの作成を確認したかを記録します。ウェブのバックアップにはローカルライブラリを使用します。",
    extensions:
      "ウェブのファイル選択では拡張子を制限せず、ファイルの内容は PKHeX Core が識別します。",
    saveAs:
      "ウェブの書き出しは常にコピーをダウンロードし、元のファイルを保持します。この項目はデスクトップの上書きと名前を付けて保存のダイアログを制御します。",
    boxDrop:
      "この項目は Windows で一時ボックスファイルを外部へドラッグします。ウェブではボックスのバイナリ書き出しを使用します。",
    focus:
      "ウェブのフォーカス表示は共通のコントロールスタイルに従います。この項目はデスクトップ独自描画の枠の余白だけを調整します。",
  },
} as const;
const paths: Readonly<Record<string, keyof (typeof reasons)["en"]>> = {
  "startup.darkMode": "theme",
  "startup.highDpiText": "dpi",
  "display.disableScalingDpi": "dpi",
  "startup.pluginLoadEnable": "plugins",
  "startup.pluginLoadMerged": "plugins",
  "startup.tryDetectRecentSave": "recent",
  "backup.bakPrompt": "backupPrompt",
  "backup.otherSaveFileExtensions": "extensions",
  "advanced.saveExportForceSaveAs": "saveAs",
  "slotExport.allowBoxDataDrop": "boxDrop",
  "display.focusBorderDeflate": "focus",
};
export function settingsPlatformReason(path: string, lang: "zh" | "en" | "ja") {
  const key = paths[path];
  return key ? reasons[lang][key] : undefined;
}
