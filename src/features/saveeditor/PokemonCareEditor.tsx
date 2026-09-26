import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CareField, PokemonPosition, PokemonRawEdit } from "./domain";
import type { saveEditorResources } from "./locales";

export function PokemonCareEditor({
  fields,
  isEgg,
  position,
  disabled,
  onApply,
}: {
  fields: CareField[];
  isEgg: boolean;
  position: PokemonPosition;
  disabled: boolean;
  onApply(edit: PokemonRawEdit): Promise<void>;
}) {
  const { t } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const initial = Object.fromEntries(
    fields.map((f) => [f.key, String(f.value)]),
  );
  const [draft, setDraft] = useState(initial);
  const changed = fields.filter(
    (f) => f.canEdit && draft[f.key] !== String(f.value),
  );
  const valid = changed.every(
    (f) => /^\d+$/.test(draft[f.key]) && Number(draft[f.key]) <= f.max,
  );
  return (
    <details className="save-pokemon-editor">
      <summary>{words.careTitle}</summary>
      <p className="save-editor-note">{words.careNote}</p>
      {isEgg && <p className="save-editor-note">{words.careEggNote}</p>}
      <fieldset className="save-editor-fields" disabled={disabled}>
        <legend>{words.careTitle}</legend>
        {fields.map((f) => (
          <label className="field" key={f.key}>
            <span>
              {isEgg && f.key === "originalFriendship"
                ? words.hatchCounter
                : words.careNames[f.key]}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={f.max}
              step={1}
              disabled={disabled || !f.canEdit}
              value={draft[f.key]}
              onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
            />
          </label>
        ))}
      </fieldset>
      {!valid && (
        <p className="save-editor-error" role="alert">
          {words.pokemonValueError}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={disabled || !changed.length}
          onClick={() => setDraft(initial)}
        >
          {words.revertMemory}
        </button>
        <button
          type="button"
          disabled={disabled || !changed.length || !valid}
          onClick={() =>
            void onApply({
              ...position,
              action: "care",
              care: {
                values: changed.map((f) => ({
                  key: f.key,
                  value: Number(draft[f.key]),
                })),
              },
            })
          }
        >
          {words.applyCare}
        </button>
      </div>
    </details>
  );
}
