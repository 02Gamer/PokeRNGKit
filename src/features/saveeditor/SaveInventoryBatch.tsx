import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import type { BagOperation, BagReport } from "./domain";
import type { saveEditorResources } from "./locales";

export function SaveInventoryBatch({
  pouch,
  disabled,
  onApply,
}: {
  pouch: BagReport["pouches"][number];
  disabled: boolean;
  onApply(edit: BagOperation): Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const [action, setAction] = useState<BagOperation["action"]>("sortName");
  const [count, setCount] = useState(String(Math.max(1, pouch.maxCount - 4)));
  const [shuffle, setShuffle] = useState(false);
  const quantity = action === "giveAll" || action === "setCount";
  const valid =
    !quantity ||
    (pouch.canGive &&
      /^\d+$/.test(count) &&
      Number.isSafeInteger(Number(count)) &&
      Number(count) >= 1 &&
      Number(count) <= pouch.maxCount);
  const actions: [BagOperation["action"], string][] = [
    ["sortName", words.bagSortName],
    ["sortNameReverse", words.bagSortNameReverse],
    ["sortCount", words.bagSortCount],
    ["sortCountReverse", words.bagSortCountReverse],
    ["sortId", words.bagSortId],
    ["sortIdReverse", words.bagSortIdReverse],
    ...(pouch.canGive
      ? ([
          ["setCount", words.bagSetCount],
          ["giveAll", words.bagGiveAll],
        ] as [BagOperation["action"], string][])
      : []),
    ["clear", words.bagClearAll],
  ];
  return (
    <details className="save-pokemon-editor">
      <summary>{words.bagBatchTitle}</summary>
      <p className="save-editor-note">{words.bagBatchNote}</p>
      <fieldset className="save-editor-fields" disabled={disabled}>
        <legend>{words.bagBatchTitle}</legend>
        <label className="field">
          <span>{words.bagAction}</span>
          <Select
            value={action}
            onChange={(e) =>
              setAction(e.target.value as BagOperation["action"])
            }
          >
            {actions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        {quantity && (
          <label className="field">
            <span>
              {words.bagCount} · 1–{pouch.maxCount}
            </span>
            <input
              inputMode="numeric"
              maxLength={String(pouch.maxCount).length}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </label>
        )}
        {action === "giveAll" && pouch.isCramped && (
          <label className="field">
            <span>{words.bagCapacityOrder}</span>
            <Select
              value={shuffle ? "random" : "ordered"}
              onChange={(e) => setShuffle(e.target.value === "random")}
            >
              <option value="ordered">{words.bagOrdered}</option>
              <option value="random">{words.bagRandom}</option>
            </Select>
          </label>
        )}
        <div className="save-editor-toolbar">
          <button
            type="button"
            className="primary"
            disabled={!valid}
            onClick={() =>
              void onApply({
                pouch: pouch.index,
                action,
                count: quantity ? Number(count) : undefined,
                language: i18n.language.startsWith("zh")
                  ? "zh-Hans"
                  : i18n.language.startsWith("ja")
                    ? "ja"
                    : "en",
                shuffle: action === "giveAll" && pouch.isCramped && shuffle,
              })
            }
          >
            {words.bagApplyBatch}
          </button>
        </div>
      </fieldset>
      {action === "giveAll" && (
        <p className="save-editor-note">
          {words.bagGiveAllNote} {pouch.isCramped && words.bagCrampedNote}
        </p>
      )}
      {action === "clear" && (
        <p className="save-editor-note">{words.bagClearAllNote}</p>
      )}
    </details>
  );
}
