import { useState } from "react";
import { Select } from "../shared/Select";
import type { BoxEdit, SaveReport } from "./domain";
import { boxBatchNames } from "./boxBatchNames";
const labels = {
  zh: {
    title: "箱子批量操作",
    action: "操作",
    groups: ["删除", "排序", "高级排序", "修改"],
    all: "全部箱子",
    current: "当前箱子",
    reverse: "反向排序／反选删除条件",
    run: "执行",
    confirm: "确认执行",
    cancel: "取消",
    note: "仅处理选定范围。锁定队伍会阻止操作，其他受保护格位会跳过。排序不移动箱名和壁纸。结果进入工作副本，可撤销。",
    scope: "范围",
    resetMovesNote: "如果默认招式无法通过检查，会改用随机建议招式。",
  },
  en: {
    title: "Box batch operations",
    action: "Operation",
    groups: ["Delete", "Sort", "Advanced sort", "Modify"],
    all: "All boxes",
    current: "Current box",
    reverse: "Reverse sorting / invert deletion criteria",
    run: "Run",
    confirm: "Confirm operation",
    cancel: "Cancel",
    note: "Only the selected range is processed. Locked teams block the operation; other protected slots are skipped. Sorting keeps box names and wallpapers in place. Changes enter the working copy and can be undone.",
    scope: "Scope",
    resetMovesNote:
      "If the default moveset fails the check, random suggested moves are used instead.",
  },
  ja: {
    title: "ボックス一括操作",
    action: "操作",
    groups: ["削除", "並べ替え", "詳細並べ替え", "変更"],
    all: "全ボックス",
    current: "現在のボックス",
    reverse: "逆順／削除条件を反転",
    run: "実行",
    confirm: "操作を確定",
    cancel: "キャンセル",
    note: "選択範囲のみ処理します。ロック中のチームがある場合は中止し、その他の保護スロットは除外します。並べ替えではボックス名と壁紙を移動しません。変更は作業コピーに適用され、元に戻せます。",
    scope: "範囲",
    resetMovesNote:
      "初期候補の技が検証に通らない場合、ランダムな推奨技に切り替わります。",
  },
};
export function BoxBatchEditor({
  report,
  box,
  disabled,
  lang,
  onApply,
}: {
  report: SaveReport;
  box: number;
  disabled: boolean;
  lang: "zh" | "en" | "ja";
  onApply(edit: BoxEdit): Promise<void>;
}) {
  const words = labels[lang],
    names = boxBatchNames[lang];
  const actions = report.boxOptions.batchActions;
  const [id, setId] = useState("SortSpecies"),
    [all, setAll] = useState(false),
    [reverse, setReverse] = useState(false),
    [review, setReview] = useState(false);
  const choice = actions.find((a) => a.id === id) ?? actions[0];
  if (!choice) return null;
  const name = names[choice.id as keyof typeof names];
  const run = () => {
    setReview(false);
    void onApply({
      box,
      name: null,
      wallpaper: null,
      batch: choice.id,
      all,
      reverse: choice.group !== 3 && reverse,
      language: lang,
    });
  };
  return (
    <fieldset disabled={disabled}>
      <legend>{words.title}</legend>
      <div className="save-editor-fields">
        <label className="field">
          <span>{words.action}</span>
          <Select
            value={choice.id}
            onChange={(e) => {
              setId(e.target.value);
              setReview(false);
            }}
          >
            {actions.map((a) => (
              <option key={a.id} value={a.id}>
                {words.groups[a.group]} · {names[a.id as keyof typeof names]}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{words.scope}</span>
          <Select
            value={all ? "all" : "current"}
            onChange={(e) => {
              setAll(e.target.value === "all");
              setReview(false);
            }}
          >
            <option value="current">
              {words.current} · {box + 1}
            </option>
            <option value="all">
              {words.all} · {report.boxCount}
            </option>
          </Select>
        </label>
      </div>
      {choice.group !== 3 && (
        <label className="save-pokedex-check">
          <input
            type="checkbox"
            checked={reverse}
            onChange={(e) => {
              setReverse(e.target.checked);
              setReview(false);
            }}
          />
          {words.reverse}
        </label>
      )}
      <p className="save-editor-note">{words.note}</p>
      {choice.id === "ModifyResetMoves" && (
        <p className="save-editor-note">{words.resetMovesNote}</p>
      )}
      {review ? (
        <div className="save-editor-toolbar">
          <span>
            {name} · {all ? words.all : `${words.current} ${box + 1}`}
            {reverse ? ` · ${words.reverse}` : ""}
          </span>
          <button type="button" onClick={run}>
            {words.confirm}
          </button>
          <button type="button" onClick={() => setReview(false)}>
            {words.cancel}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => (choice.group === 3 ? run() : setReview(true))}
        >
          {words.run}
        </button>
      )}
    </fieldset>
  );
}
