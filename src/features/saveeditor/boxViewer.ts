// SPDX-License-Identifier: GPL-3.0-or-later
import type { BoxEdit, SaveReport } from "./domain";

export function boxViewIndex(box: number, count: number): number {
  if (!Number.isInteger(count) || count < 1) throw Error("No boxes available.");
  return Number.isInteger(box) && box >= 0 && box < count ? box : 0;
}

export function moveBoxView(
  box: number,
  count: number,
  direction: -1 | 1,
  edge = false,
): number {
  const current = boxViewIndex(box, count);
  if (direction !== -1 && direction !== 1)
    throw Error("Invalid box direction.");
  return edge
    ? direction === -1
      ? 0
      : count - 1
    : (current + direction + count) % count;
}

// SAVEditor.SwapBoxesViewer exchanges the two displayed indexes, not box data.
export function swapBoxViews(main: number, secondary: number, count: number) {
  return {
    main: boxViewIndex(secondary, count),
    secondary: boxViewIndex(main, count),
  };
}

export function currentBoxEdit(
  report: Pick<SaveReport, "boxCount" | "boxOptions" | "checksumsValid">,
  box: number,
): BoxEdit | undefined {
  if (!Number.isInteger(box) || box < 0 || box >= report.boxCount)
    throw Error("Invalid current box.");
  if (
    !report.checksumsValid ||
    !report.boxOptions.canSetCurrentBox ||
    report.boxOptions.currentBox === box
  )
    return undefined;
  return { box, name: null, wallpaper: null, currentBox: box };
}

export const boxViewerWords = {
  zh: {
    viewer: "第二箱查看器",
    main: "主箱",
    secondary: "第二箱",
    swap: "交换显示",
    previous: "上一箱",
    next: "下一箱",
    first: "首箱",
    last: "末箱",
    note: "交换显示只交换两个视图的箱子编号。主箱选择会更新支持格式的当前箱子记录；第二箱选择不写入存档。",
  },
  en: {
    viewer: "Second box viewer",
    main: "Main box",
    secondary: "Second box",
    swap: "Swap views",
    previous: "Previous",
    next: "Next",
    first: "First",
    last: "Last",
    note: "Swap views exchanges the displayed box indexes. The main selection updates the current-box record for supported formats; the second selection does not edit the save.",
  },
  ja: {
    viewer: "第2ボックス表示",
    main: "メイン",
    secondary: "第2ボックス",
    swap: "表示を交換",
    previous: "前のボックス",
    next: "次のボックス",
    first: "最初",
    last: "最後",
    note: "表示交換は2つの表示番号を入れ替えます。対応形式ではメインの選択を現在ボックスに保存します。第2ボックスの選択はセーブを変更しません。",
  },
};
