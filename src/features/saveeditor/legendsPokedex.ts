import type { LocalizedText } from "./domain";
export interface Dex8aFormState {
  form: number;
  flags: boolean[][];
  hasMax: boolean;
  sizes: string[];
}
export interface Dex8aState {
  species: number;
  solitude: boolean;
  displayForm: number;
  displayFemale: boolean;
  displayShiny: boolean;
  displayAlpha: boolean;
  forms: Dex8aFormState[];
  tasks: number[];
}
export interface Dex8aForm {
  form: number;
  name: LocalizedText;
  theory: string[];
  obtainedGenderMask: number;
}
export interface Dex8aTask {
  name: LocalizedText;
  editable: boolean;
  derivedForms: boolean;
  thresholds: number[];
  reported: number;
  reached: number;
  points: number;
  required: boolean;
}
export interface Dex8aEntry {
  state: Dex8aState;
  number: number;
  name: LocalizedText;
  canSelectGender: boolean;
  forms: Dex8aForm[];
  tasks: Dex8aTask[];
  advanced: { name: LocalizedText; value: number }[];
  research: {
    updated: boolean;
    complete: boolean;
    perfect: boolean;
    updateIndex: number;
    reported: number;
    pending: number;
  };
}
export interface Dex8aCatalog {
  canEdit: boolean;
  entries: Dex8aEntry[];
}
export type Dex8aEdit =
  | { action: "entry"; entry: Dex8aState }
  | { action: "report"; species: number }
  | { action: "advanced"; species: number; counters: number[] };
export function validateDex8a(state: Dex8aState, entry: Dex8aEntry): Dex8aEdit {
  const old = entry.state;
  const displayChanged =
    state.displayForm !== old.displayForm ||
    state.displayFemale !== old.displayFemale ||
    state.displayShiny !== old.displayShiny ||
    state.displayAlpha !== old.displayAlpha;
  if (
    state.species !== old.species ||
    !Number.isInteger(state.displayForm) ||
    (state.displayForm !== old.displayForm &&
      !entry.forms.some((f) => f.form === state.displayForm)) ||
    (displayChanged && state.displayForm >= 120) ||
    (state.displayFemale !== old.displayFemale && !entry.canSelectGender) ||
    state.forms.length !== old.forms.length ||
    state.tasks.length !== old.tasks.length ||
    [
      state.solitude,
      state.displayFemale,
      state.displayAlpha,
      state.displayShiny,
    ].some((v) => typeof v !== "boolean")
  )
    throw new Error("Pokedex choices are invalid.");
  state.forms.forEach((f, i) => {
    if (
      f.form !== old.forms[i].form ||
      f.flags.length !== 3 ||
      f.flags.some(
        (r) => r.length !== 8 || r.some((v) => typeof v !== "boolean"),
      ) ||
      typeof f.hasMax !== "boolean" ||
      f.sizes.length !== 4 ||
      f.sizes.some((v) => typeof v !== "string" || v.length > 32767)
    )
      throw new Error("Pokedex choices are invalid.");
  });
  state.tasks.forEach((v, i) => {
    if (
      !Number.isInteger(v) ||
      (v !== old.tasks[i] && (!entry.tasks[i].editable || v < 0 || v > 60000))
    )
      throw new Error("Pokedex choices are invalid.");
  });
  return {
    action: "entry",
    entry: {
      ...state,
      forms: state.forms.map((f) => ({
        ...f,
        flags: f.flags.map((r) => [...r]),
        sizes: [...f.sizes],
      })),
      tasks: [...state.tasks],
    },
  };
}
function visibleObtained(state: Dex8aState, entry: Dex8aEntry): number {
  return state.forms.reduce((total, f, i) => {
    const flags = f.flags[1],
      mask = entry.forms[i].obtainedGenderMask;
    const g0 = flags.some((v, n) => n % 2 === 0 && v),
      g1 = flags.some((v, n) => n % 2 === 1 && v);
    return (
      total +
      [g0, g1, g0, g0 || g1, g0, g1].filter(
        (v, n) => v && (mask & (1 << n)) !== 0,
      ).length
    );
  }, 0);
}
export function previewDex8aTasks(
  state: Dex8aState,
  entry: Dex8aEntry,
): number[] {
  const delta =
    visibleObtained(state, entry) - visibleObtained(entry.state, entry);
  return state.tasks.map((value, i) =>
    entry.tasks[i].derivedForms ? entry.state.tasks[i] + delta : value,
  );
}
export function projectedDex8aPoints(
  state: Dex8aState,
  entry: Dex8aEntry,
): number {
  return previewDex8aTasks(state, entry).reduce((total, value, i) => {
    const task = entry.tasks[i];
    let reached = 0;
    for (const threshold of task.thresholds) {
      if (value < threshold) break;
      reached++;
    }
    return total + Math.max(0, reached - task.reported) * task.points;
  }, entry.research.reported);
}
export const legendsDexLabels = {
  zh: {
    form: "当前形态",
    displayForm: "显示形态",
    female: "显示雌性",
    shiny: "显示闪光",
    alpha: "显示头目",
    solitude: "完成只身道",
    flagGroups: ["野外见过", "已获得", "野外捕获"],
    flags: [
      "雄性／无性别",
      "雌性",
      "头目雄性／无性别",
      "头目雌性",
      "闪光雄性／无性别",
      "闪光雌性",
      "闪光头目雄性／无性别",
      "闪光头目雌性",
    ],
    sizes: ["最小身高", "最大身高", "最小体重", "最大体重"],
    hasMax: "记录最大体型",
    theory: "理论范围",
    research: "图鉴研究",
    updated: "已更新",
    complete: "已完成",
    perfect: "完美",
    index: "更新序号",
    reported: "已汇报研究值",
    projected: "汇报后预计研究值",
    progress: "当前进度",
    thresholds: "任务阈值",
    reportedSteps: "已汇报阶段",
    points: "每阶段点数",
    required: "完成所需",
    report: "汇报当前宝可梦研究",
    advanced: "高级研究：全部 30 项计数",
    applyAdvanced: "应用高级计数",
    note: "修改进度后需另行汇报研究，才能更新完成状态和研究点数。形态获得数随勾选计算；剧情与委托进度只读。高级计数范围 0–60000，未修改的范围外原值保留。体型使用小数点；无法解析的文本保留原值，负的最小值归零，最大值低于最小值或未启用最大体型时按最小值保存。所有操作进入工作副本，可撤销。",
  },
  en: {
    form: "Current form",
    displayForm: "Displayed form",
    female: "Display female",
    shiny: "Display shiny",
    alpha: "Display alpha",
    solitude: "Path of Solitude complete",
    flagGroups: ["Seen in wild", "Obtained", "Caught in wild"],
    flags: [
      "Male / genderless",
      "Female",
      "Alpha male / genderless",
      "Alpha female",
      "Shiny male / genderless",
      "Shiny female",
      "Shiny alpha male / genderless",
      "Shiny alpha female",
    ],
    sizes: [
      "Minimum height",
      "Maximum height",
      "Minimum weight",
      "Maximum weight",
    ],
    hasMax: "Record maximum size",
    theory: "Theoretical range",
    research: "Pokédex research",
    updated: "Updated",
    complete: "Complete",
    perfect: "Perfect",
    index: "Update index",
    reported: "Reported research value",
    projected: "Projected value after reporting",
    progress: "Current progress",
    thresholds: "Task thresholds",
    reportedSteps: "Reported stages",
    points: "Points per stage",
    required: "Required for completion",
    report: "Report research for current Pokémon",
    advanced: "Advanced research: all 30 counters",
    applyAdvanced: "Apply advanced counters",
    note: "Report research after editing progress to update completion and research points. Obtained-form counts follow the flags; story and quest progress are read-only. Counters allow 0–60000 and retain unchanged out-of-range originals. Sizes use a decimal point. Unparseable text retains the original value; negative minima become zero. Maxima below minima, or disabled maximum records, use the minimum. All operations use the working copy and can be undone.",
  },
  ja: {
    form: "現在のフォルム",
    displayForm: "表示フォルム",
    female: "メスを表示",
    shiny: "色違いを表示",
    alpha: "オヤブンを表示",
    solitude: "いっぴき道突破",
    flagGroups: ["野生で見た", "入手済み", "野生で捕獲"],
    flags: [
      "オス／性別不明",
      "メス",
      "オヤブンのオス／性別不明",
      "オヤブンのメス",
      "色違いのオス／性別不明",
      "色違いのメス",
      "色違いオヤブンのオス／性別不明",
      "色違いオヤブンのメス",
    ],
    sizes: ["最小の高さ", "最大の高さ", "最小の重さ", "最大の重さ"],
    hasMax: "最大サイズを記録",
    theory: "理論上の範囲",
    research: "図鑑研究",
    updated: "更新済み",
    complete: "完成",
    perfect: "完璧",
    index: "更新番号",
    reported: "報告済みの研究値",
    projected: "報告後の予想研究値",
    progress: "現在の進捗",
    thresholds: "タスクのしきい値",
    reportedSteps: "報告済みの段階",
    points: "段階ごとの点数",
    required: "完成に必要",
    report: "現在のポケモンの研究を報告",
    advanced: "詳細研究：全 30 カウンター",
    applyAdvanced: "詳細カウンターを適用",
    note: "進捗の編集後に研究を報告すると、完成状態と研究点が更新されます。入手フォルム数はフラグから計算し、物語・依頼の進捗は読み取り専用です。カウンターは 0–60000、未変更の範囲外の元値は保持します。サイズは小数点を使用します。解析できない文字列は元値を保持し、負の最小値は 0、最小値未満または最大記録無効時の最大値は最小値になります。作業コピーに適用し、元に戻せます。",
  },
};
