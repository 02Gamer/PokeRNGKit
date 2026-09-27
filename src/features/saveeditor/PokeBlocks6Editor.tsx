import { useEffect, useState } from "react";
import {
  foodWords,
  pokeBlockWords,
  validatePokeBlocks,
  type PokeBlocks6Catalog,
  type SaveFoodEdit,
} from "./saveFood";

export function PokeBlocks6Editor({
  catalog,
  disabled,
  lang,
  onApply,
  onDirty,
}: {
  catalog: PokeBlocks6Catalog;
  disabled: boolean;
  lang: "zh" | "en" | "ja";
  onApply(edit: SaveFoodEdit): Promise<void>;
  onDirty(value: boolean): void;
}) {
  const words = pokeBlockWords[lang];
  const common = foodWords[lang];
  const [values, setValues] = useState(catalog.values.map(String));
  const [invalid, setInvalid] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const dirty = values.some((v, i) => v !== String(catalog.values[i]));
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  const apply = () => {
    setInvalid(false);
    let edit: SaveFoodEdit;
    try {
      edit = validatePokeBlocks(catalog, values);
    } catch {
      setInvalid(true);
      return;
    }
    void onApply(edit);
  };
  return (
    <fieldset className="save-food-fields" disabled={disabled}>
      <legend>{words.blocks}</legend>
      <div className="save-editor-fields">
        {catalog.names.map((n, i) => (
          <label key={i} className="field">
            <span>{n[lang]} · 0–999</span>
            <input
              value={values[i]}
              inputMode="numeric"
              maxLength={10}
              onChange={(e) =>
                setValues((old) =>
                  old.map((v, j) => (i === j ? e.target.value : v)),
                )
              }
            />
          </label>
        ))}
      </div>
      {invalid && (
        <p className="save-editor-error" role="alert">
          {words.invalid}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          className="primary"
          disabled={disabled || !dirty}
          onClick={apply}
        >
          {common.apply}
        </button>
        <button
          type="button"
          disabled={disabled || !dirty}
          onClick={() => {
            setValues(catalog.values.map(String));
            setInvalid(false);
          }}
        >
          {common.discard}
        </button>
        <button
          type="button"
          disabled={disabled || dirty}
          onClick={() => void onApply({ action: "blocksFill" })}
        >
          {common.fill}
        </button>
        <button
          type="button"
          disabled={disabled || dirty}
          onClick={() => void onApply({ action: "blocksClear" })}
        >
          {common.clear}
        </button>
      </div>
      <p className="save-editor-note">{common.note}</p>
      <details className="save-pokemon-editor">
        <summary>{words.berries}</summary>
        <p>
          {words.occupied}: {catalog.occupiedPlots} / {catalog.plotCount}
        </p>
        <p className="save-editor-note">
          {words.note.replace("{count}", String(catalog.plotCount))}
        </p>
        <div className="save-editor-toolbar">
          {confirm ? (
            <>
              <button
                type="button"
                disabled={disabled || dirty}
                onClick={() => void onApply({ action: "berries" })}
              >
                {words.confirm}
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setConfirm(false)}
              >
                {words.cancel}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={disabled || dirty}
              onClick={() => setConfirm(true)}
            >
              {words.reset}
            </button>
          )}
        </div>
      </details>
    </fieldset>
  );
}
