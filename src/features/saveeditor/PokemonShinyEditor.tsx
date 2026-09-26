import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import type { PokemonPosition, PokemonRawEdit } from "./domain";
import type { saveEditorResources } from "./locales";

export function PokemonShinyEditor({
  position,
  disabled,
  onApply,
}: {
  position: PokemonPosition;
  disabled: boolean;
  onApply(edit: PokemonRawEdit): Promise<void>;
}) {
  const { t } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const [method, setMethod] = useState<"pid" | "sid">("pid");
  const [type, setType] = useState<"any" | "star" | "square" | "off">("any");
  return (
    <details className="save-pokemon-editor">
      <summary>{words.shinyEdit}</summary>
      <p className="save-editor-note">
        {method === "pid" ? words.shinyPidNote : words.shinySidNote}
      </p>
      <fieldset className="save-editor-fields" disabled={disabled}>
        <legend>{words.shinyEdit}</legend>
        <label className="field">
          <span>{words.shinyMethod}</span>
          <Select
            disabled={disabled}
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
          >
            <option value="pid">{words.shinyPid}</option>
            <option value="sid">{words.shinySid}</option>
          </Select>
        </label>
        <label className="field">
          <span>{words.shinyTarget}</span>
          <Select
            disabled={disabled}
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          >
            <option value="any">{words.shinyAny}</option>
            <option value="star">{words.shinyStar}</option>
            <option value="square">{words.shinySquare}</option>
            <option value="off">{words.shinyOff}</option>
          </Select>
        </label>
      </fieldset>
      <p className="save-editor-note">{words.shinyTypeNote}</p>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            void onApply({
              ...position,
              action: "shiny",
              shiny: { method, type },
            })
          }
        >
          {words.applyShiny}
        </button>
      </div>
    </details>
  );
}
