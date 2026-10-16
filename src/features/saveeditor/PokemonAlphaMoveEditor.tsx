// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PokemonSelect as Select } from "./PokemonSelect";
import {
  alphaMoveEdit,
  alphaMoveWords,
  isAlphaMoveSelectable,
} from "./alphaMove";
import { usePokemonDraftValidator } from "./pokemonDraftValidation";
import { playSaveSound } from "./saveSound";
import type { MoveChoice, PokemonPosition, PokemonRawEdit } from "./domain";

export function PokemonAlphaMoveEditor({
  move,
  choices,
  position,
  disabled,
  onApply,
}: {
  move: number;
  choices: MoveChoice[];
  position: PokemonPosition;
  disabled: boolean;
  onApply(edit: PokemonRawEdit): Promise<void>;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const words = alphaMoveWords[lang];
  const [draft, setDraft] = useState(move);
  const [error, setError] = useState(false);
  const buildEdit = () => alphaMoveEdit(position, draft, choices);
  usePokemonDraftValidator("alphaMove", buildEdit, !disabled);
  async function apply() {
    if (disabled || draft === move) return;
    setError(false);
    try {
      await onApply(buildEdit());
    } catch {
      playSaveSound("other", "exclamation");
      setError(true);
    }
  }
  return (
    <details className="save-pokemon-editor">
      <summary>{words.title}</summary>
      <p className="save-editor-note">{words.note}</p>
      <fieldset disabled={disabled} className="save-editor-fields">
        <legend>{words.title}</legend>
        <label className="field">
          <span>{words.title}</span>
          <Select
            disabled={disabled}
            value={draft}
            onChange={(e) => setDraft(Number(e.target.value))}
          >
            {!isAlphaMoveSelectable(draft, choices) && (
              <option value={draft} disabled data-source-invalid>
                #{draft}
              </option>
            )}
            {choices.map((choice, id) =>
              choice.alphaSelectable === false ? null : (
                <option key={id} value={id}>
                  {choice.name[lang]}
                </option>
              ),
            )}
          </Select>
        </label>
      </fieldset>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={
            disabled || draft === move || !isAlphaMoveSelectable(draft, choices)
          }
          onClick={() => void apply()}
        >
          {words.apply}
        </button>
      </div>
      {error && (
        <p role="alert" className="save-editor-error">
          {words.error}
        </p>
      )}
    </details>
  );
}
