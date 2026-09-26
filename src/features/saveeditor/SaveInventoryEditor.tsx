import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import type { BagEdit, BagItem, BagReport } from "./domain";
import type { saveEditorResources } from "./locales";
import { ItemImage } from "./ItemImage";

export function SaveInventoryEditor({
  item,
  pouch,
  disabled,
  onApply,
}: {
  item: BagItem;
  pouch: BagReport["pouches"][number];
  disabled: boolean;
  onApply(edit: BagEdit): Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const initial = {
    id: item.id,
    count: String(item.count),
    favorite: item.favorite,
    isNew: item.isNew,
    freeSpace: item.freeSpace,
    freeSpaceIndex:
      item.freeSpaceIndex === null ? null : String(item.freeSpaceIndex),
    newShop: item.newShop,
    held: item.held,
  };
  const [draft, setDraft] = useState(initial);
  const choice = pouch.choices.find((c) => c.id === draft.id);
  const count = Number(draft.count);
  const order =
    draft.freeSpaceIndex === null ? null : Number(draft.freeSpaceIndex);
  const valid =
    choice !== undefined &&
    /^\d+$/.test(draft.count) &&
    Number.isSafeInteger(count) &&
    count <= choice.maxCount &&
    (draft.id === 0 || item.isNew !== null || count > 0) &&
    (order === null ||
      (/^\d+$/.test(draft.freeSpaceIndex!) &&
        Number.isSafeInteger(order) &&
        order <= 1023));
  const changed = JSON.stringify(draft) !== JSON.stringify(initial);
  return (
    <fieldset className="save-editor-fields" disabled={disabled}>
      <legend>
        {words.editBagItem} · {words.slot} {item.slot + 1}
      </legend>
      <label className="field">
        <span className="save-inventory-item-label">
          <ItemImage sprite={choice?.sprite ?? item.sprite} />
          {words.bagItem}
        </span>
        <Select
          value={draft.id}
          onChange={(e) => {
            const id = Number(e.target.value);
            const next = pouch.choices.find((c) => c.id === id)!;
            setDraft({
              ...draft,
              id,
              count: String(
                id === 0 ? 0 : Math.max(1, Math.min(count || 1, next.maxCount)),
              ),
            });
          }}
        >
          {!choice && <option value={draft.id}>#{draft.id}</option>}
          {pouch.choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name[lang]}
            </option>
          ))}
        </Select>
      </label>
      <label className="field">
        <span>
          {words.bagCount} · {words.bagMax}: {choice?.maxCount ?? "—"}
        </span>
        <input
          inputMode="numeric"
          value={draft.count}
          maxLength={5}
          onChange={(e) => setDraft({ ...draft, count: e.target.value })}
        />
      </label>
      {(
        [
          ["favorite", words.bagFavorite],
          ["isNew", words.bagNew],
          ["freeSpace", words.bagFreeSpace],
          ["newShop", words.bagNewShop],
          ["held", words.bagHeld],
        ] as const
      ).map(([key, label]) =>
        draft[key] === null ? null : (
          <label key={key} className="save-inventory-empty">
            <input
              type="checkbox"
              checked={draft[key]}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
            />
            {label}
          </label>
        ),
      )}
      {draft.freeSpaceIndex !== null && (
        <label className="field">
          <span>{words.bagFreeSpaceIndex} · 0–1023</span>
          <input
            inputMode="numeric"
            maxLength={4}
            value={draft.freeSpaceIndex}
            onChange={(e) =>
              setDraft({ ...draft, freeSpaceIndex: e.target.value })
            }
          />
        </label>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          onClick={() => setDraft(initial)}
          disabled={!changed}
        >
          {words.revertBagItem}
        </button>
        <button
          type="button"
          onClick={() =>
            setDraft({
              ...draft,
              id: 0,
              count: "0",
              favorite: draft.favorite === null ? null : false,
              isNew: draft.isNew === null ? null : false,
              freeSpace: draft.freeSpace === null ? null : false,
              freeSpaceIndex: order === null ? null : "0",
              newShop: draft.newShop === null ? null : false,
              held: draft.held === null ? null : false,
            })
          }
        >
          {words.clearBagItem}
        </button>
        <button
          type="button"
          className="primary"
          disabled={!valid || !changed}
          onClick={() =>
            void onApply({
              ...draft,
              pouch: pouch.index,
              slot: item.slot,
              count,
              freeSpaceIndex: order,
            })
          }
        >
          {words.applyBagItem}
        </button>
      </div>
    </fieldset>
  );
}
