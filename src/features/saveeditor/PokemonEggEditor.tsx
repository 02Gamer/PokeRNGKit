import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { PokemonEntry, PokemonPosition, PokemonRawEdit } from "./domain";
import type { saveEditorResources } from "./locales";

export function PokemonEggEditor({
  egg,
  position,
  disabled,
  onApply,
  children,
}: {
  egg: PokemonEntry["eggInfo"];
  position: PokemonPosition;
  disabled: boolean;
  onApply(edit: PokemonRawEdit): Promise<void>;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const [cycles, setCycles] = useState(String(egg?.cycles ?? 0));
  const [error, setError] = useState("");
  const apply = async () => {
    setError("");
    if (!/^\d+$/.test(cycles) || Number(cycles) > 255) {
      setError(words.pokemonValueError);
      return;
    }
    await onApply({
      ...position,
      action: "egg",
      egg: { action: "cycles", cycles: Number(cycles) },
    });
  };
  if (!egg)
    return (
      <details className="save-pokemon-editor">
        <summary>{words.eggDetails}</summary>
        <p className="save-editor-note">{words.makeEggNote}</p>
        {children}
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              void onApply({
                ...position,
                action: "egg",
                egg: { action: "makeEgg" },
              })
            }
          >
            {words.makeEgg}
          </button>
        </div>
      </details>
    );
  return (
    <details className="save-pokemon-editor">
      <summary>{words.eggDetails}</summary>
      {children}
      <p className="save-editor-note">
        {words.hatchCounterNote} {words.hatchMinimum}: {egg.suggestedMinimum}
      </p>
      <fieldset disabled={disabled} className="save-editor-fields">
        <legend>{words.eggDetails}</legend>
        <label className="field">
          <span>{words.hatchCounter}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={255}
            step={1}
            value={cycles}
            onChange={(e) => setCycles(e.target.value)}
          />
        </label>
      </fieldset>
      {error && (
        <p className="save-editor-error" role="alert">
          {error}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={disabled || cycles === String(egg.cycles)}
          onClick={() => void apply()}
        >
          {words.applyHatchCounter}
        </button>
      </div>
      <p className="save-editor-note">{words.hatchEggNote}</p>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            void onApply({
              ...position,
              action: "egg",
              egg: { action: "hatch" },
            })
          }
        >
          {words.hatchEgg}
        </button>
      </div>
    </details>
  );
}
