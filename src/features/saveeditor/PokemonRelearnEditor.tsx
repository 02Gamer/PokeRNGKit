import { usePokemonDraftPreparation } from "./pokemonDraftValidation";
import { rawDraftSteps } from "./pokemonDraftPlan";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PokemonSelect as Select } from "./PokemonSelect";
import { usePokemonDraftValidator } from "./pokemonDraftValidation";
import type { PokemonPosition, PokemonRawEdit, SaveReport } from "./domain";
import type { saveEditorResources } from "./locales";

export function PokemonRelearnEditor({
  moves,
  choices,
  position,
  disabled,
  onApply,
  onSuggest,
}: {
  moves: number[] | null;
  choices: SaveReport["moveChoices"];
  position: PokemonPosition;
  disabled: boolean;
  onApply(edit: PokemonRawEdit): Promise<void>;
  onSuggest(position: PokemonPosition): Promise<number[] | undefined>;
}) {
  const { t, i18n } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const language = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const [draft, setDraft] = useState(moves ?? [0, 0, 0, 0]);
  usePokemonDraftValidator(
    "relearn",
    () => {
      if (
        draft.length !== 4 ||
        draft.some((move) => !Number.isInteger(move) || !choices[move])
      )
        throw Error("Invalid relearn move");
    },
    !disabled && moves !== null,
  );
  usePokemonDraftPreparation(
    "relearn",
    () =>
      rawDraftSteps(
        moves && draft.some((v, i) => v !== moves[i])
          ? { action: "relearn", relearn: { moves: draft } }
          : undefined,
      ),
    !disabled && moves !== null,
  );
  const request = useRef(0);
  useEffect(() => {
    const lifecycle = request;
    return () => {
      lifecycle.current++;
    };
  }, []);
  if (!moves) return null;
  const suggest = async () => {
    const id = ++request.current;
    const result = await onSuggest(position);
    if (id === request.current && result?.length === 4) setDraft(result);
  };
  return (
    <details className="save-pokemon-editor">
      <summary>{words.relearnMoves}</summary>
      <p className="save-editor-note">{words.relearnNote}</p>
      <fieldset disabled={disabled} className="save-editor-fields">
        <legend>{words.relearnMoves}</legend>
        {draft.map((move, slot) => (
          <label key={slot} className="field">
            <span>
              {words.relearnMoves} {slot + 1}
            </span>
            <Select
              disabled={disabled}
              value={move}
              onChange={(e) =>
                setDraft(
                  draft.map((value, i) =>
                    i === slot ? Number(e.target.value) : value,
                  ),
                )
              }
            >
              {!choices[move] && (
                <option value={move} disabled data-source-invalid>
                  #{move}
                </option>
              )}
              {choices.map((choice, id) => (
                <option key={id} value={id}>
                  {choice.name[language]}
                </option>
              ))}
            </Select>
          </label>
        ))}
      </fieldset>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void suggest()}
        >
          {words.suggestRelearn}
        </button>
        <button
          type="button"
          disabled={disabled || draft.every((move) => move === 0)}
          onClick={() => setDraft([0, 0, 0, 0])}
        >
          {words.clearRelearn}
        </button>
        <button
          type="button"
          disabled={disabled || draft.every((move, i) => move === moves[i])}
          onClick={() =>
            void onApply({
              ...position,
              action: "relearn",
              relearn: { moves: draft },
            })
          }
        >
          {words.applyRelearn}
        </button>
      </div>
    </details>
  );
}
