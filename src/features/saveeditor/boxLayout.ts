import type { SaveReport } from "./domain";
export function boxFlags(
  values: string[],
  options: SaveReport["boxOptions"],
): number[] {
  if (
    values.length !== options.flags.length ||
    values.some((v) => !/^[0-9a-f]{1,2}$/i.test(v))
  )
    throw new Error("Invalid box layout values.");
  const result = values.map((v) => parseInt(v, 16));
  if (result.some((v) => v > options.flagMaximum))
    throw new Error("Invalid box layout values.");
  return result;
}
export const boxLayoutLabels = {
  zh: {
    unlocked: "解锁箱数",
    flags: "箱子标记（十六进制）",
    swap: "交换整箱",
    target: "目标箱子",
    reset: "还原未应用修改",
    error: "请检查箱数与十六进制标记范围。",
    note: "交换会同时移动宝可梦、箱名与壁纸；锁定或已登记到对战队伍的格位会阻止交换。操作可撤销。",
    flagsNote: "第六世代修改解锁箱数会同步更新最后一个箱子的解锁标记。",
    max: "最大值",
  },
  en: {
    unlocked: "Unlocked boxes",
    flags: "Box flags (hexadecimal)",
    swap: "Swap entire boxes",
    target: "Target box",
    reset: "Reset draft",
    error: "Check the box count and hexadecimal flag ranges.",
    note: "Swapping moves Pokémon, box names and wallpapers together. Locked slots or battle-team registrations prevent swapping. The operation can be undone.",
    flagsNote:
      "In Generation VI, changing the unlocked count also updates the final box unlock flag.",
    max: "Maximum",
  },
  ja: {
    unlocked: "解放済みボックス数",
    flags: "ボックスフラグ（16進数）",
    swap: "ボックス全体を交換",
    target: "交換先ボックス",
    reset: "未適用の変更を戻す",
    error: "ボックス数と16進数フラグの範囲を確認してください。",
    note: "ポケモン・ボックス名・壁紙をまとめて交換します。ロック中またはバトルチームに登録済みのスロットがある場合は交換できません。操作は元に戻せます。",
    flagsNote:
      "第６世代では解放数の変更に合わせて最後のボックスの解放フラグも更新されます。",
    max: "最大値",
  },
};
