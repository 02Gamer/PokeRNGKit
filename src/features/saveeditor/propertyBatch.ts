export interface PropertyBatchRequest {
  text: string;
  scope: "box" | "boxes" | "party";
  box: number;
  language: "zh" | "en" | "ja";
}
export interface PropertyBatchConfirmation {
  token: string;
  allowErrors: boolean;
  allowEmpty: boolean;
  allowIgnored: boolean;
}
export interface PropertyBatchCatalog {
  format: string;
  fields: { name: string; type: string }[];
}
export interface PropertyBatchTicket {
  token: string;
  summary: {
    groups: number;
    filters: number;
    instructions: number;
    changedSlots: number;
    ignoredLines: number[];
    emptyValues: boolean;
    outcomes: {
      group: number;
      box: number;
      slot: number;
      result: string;
      error: boolean;
    }[];
  };
}

export const propertyBatchWords = {
  zh: {
    title: "通用批量编辑",
    load: "加载属性",
    scope: "范围",
    scopes: ["指定箱子", "全部箱子", "队伍"],
    box: "箱子",
    property: "属性",
    operator: "操作符",
    value: "值",
    add: "添加指令",
    text: "指令",
    preview: "预览结果",
    apply: "应用预览",
    cancel: "取消预览",
    group: "指令组",
    slot: "格位",
    result: "结果",
    changed: "改动的宝可梦",
    instructions: "有效指令",
    filters: "筛选条件",
    errors: "确认保留部分成功的修改",
    empty: "确认使用空值",
    ignored: "确认忽略未识别行",
    failure: "包含失败",
    previous: "上一页",
    next: "下一页",
    note: "先预览再应用。每行一条指令，分号单独成行分组；箱号和格位从 1 开始。属性名使用 PKHeX 原名，名称值按当前语言解析。结果进入工作副本，可撤销。",
    states: {
      modified: "已处理",
      filtered: "不匹配",
      skipped: "已跳过",
      protected: "受保护",
      invalid: "数据无效",
    },
  },
  en: {
    title: "Property batch editor",
    load: "Load properties",
    scope: "Scope",
    scopes: ["Selected box", "All boxes", "Party"],
    box: "Box",
    property: "Property",
    operator: "Operator",
    value: "Value",
    add: "Add instruction",
    text: "Instructions",
    preview: "Preview results",
    apply: "Apply preview",
    cancel: "Discard preview",
    group: "Group",
    slot: "Slot",
    result: "Result",
    changed: "Changed Pokémon",
    instructions: "Parsed instructions",
    filters: "Filters",
    errors: "Keep partially successful changes",
    empty: "Allow empty values",
    ignored: "Ignore unrecognized lines",
    failure: "Contains errors",
    previous: "Previous",
    next: "Next",
    note: "Preview before applying. Use one instruction per line and a semicolon on its own line between groups. Box and slot numbers start at 1. Property identifiers use PKHeX names; name values use the current language. Changes enter the working copy and can be undone.",
    states: {
      modified: "Processed",
      filtered: "Not matched",
      skipped: "Skipped",
      protected: "Protected",
      invalid: "Invalid data",
    },
  },
  ja: {
    title: "プロパティ一括編集",
    load: "プロパティを読み込む",
    scope: "範囲",
    scopes: ["指定ボックス", "全ボックス", "手持ち"],
    box: "ボックス",
    property: "プロパティ",
    operator: "演算子",
    value: "値",
    add: "命令を追加",
    text: "命令",
    preview: "結果を確認",
    apply: "確認した結果を適用",
    cancel: "プレビューを破棄",
    group: "命令グループ",
    slot: "スロット",
    result: "結果",
    changed: "変更したポケモン",
    instructions: "解析済み命令",
    filters: "条件",
    errors: "一部成功した変更を保持する",
    empty: "空の値を許可する",
    ignored: "認識できない行を無視する",
    failure: "エラーあり",
    previous: "前へ",
    next: "次へ",
    note: "適用前に結果を確認します。1 行に 1 命令を入力し、グループはセミコロンだけの行で区切ります。ボックスとスロットは 1 から数えます。プロパティ名は PKHeX の識別子、名称の値は現在の言語を使います。作業コピーへの変更は元に戻せます。",
    states: {
      modified: "処理済み",
      filtered: "条件不一致",
      skipped: "スキップ",
      protected: "保護対象",
      invalid: "無効なデータ",
    },
  },
};
