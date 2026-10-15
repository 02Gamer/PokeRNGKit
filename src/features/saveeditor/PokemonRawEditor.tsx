import { useState } from "react";
import { playSaveSound } from "./saveSound";
import { useTranslation } from "react-i18next";
import {
  parsePokemonHex,
  type PokemonEntry,
  type PokemonRawEdit,
} from "./domain";
import type { saveEditorResources } from "./locales";
import { useSavePrivacy } from "./useSavePrivacy";
import { normalizeHomeTracker } from "./homeTracker";

const hex = (value: number) =>
  value.toString(16).toUpperCase().padStart(8, "0");

export function PokemonRawEditor({
  pokemon,
  disabled,
  onApply,
}: {
  pokemon: PokemonEntry;
  disabled: boolean;
  onApply(edit: PokemonRawEdit): Promise<void>;
}) {
  const { t } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const [pid, setPid] = useState(hex(pokemon.pid));
  const [ec, setEc] = useState(hex(pokemon.encryptionConstant));
  const [tracker, setTracker] = useState(pokemon.homeTracker ?? "");
  const [error, setError] = useState("");
  const privacy = useSavePrivacy();
  const apply = async (action: PokemonRawEdit["action"]) => {
    setError("");
    try {
      const edit: PokemonRawEdit = {
        box: pokemon.box,
        slot: pokemon.slot,
        action,
      };
      if (action === "values") {
        const parsedPid = parsePokemonHex(pid);
        if (parsedPid !== pokemon.pid) edit.pid = parsedPid;
        if (pokemon.canEditEncryptionConstant) {
          const parsedEc = parsePokemonHex(ec);
          if (parsedEc !== pokemon.encryptionConstant)
            edit.encryptionConstant = parsedEc;
        }
        if (pokemon.homeTracker != null) {
          const value = normalizeHomeTracker(tracker);
          if (value !== pokemon.homeTracker) edit.homeTracker = value;
        }
        if (
          edit.pid === undefined &&
          edit.encryptionConstant === undefined &&
          edit.homeTracker === undefined
        )
          return;
      }
      await onApply(edit);
    } catch {
      playSaveSound("other", "exclamation");
      setError(words.rawValueError);
    }
  };
  if (privacy.hideSecretDetails) return null;
  return (
    <details className="save-pokemon-editor">
      <summary>{words.rawPokemonValues}</summary>
      <p className="save-editor-note">{words.rawPokemonNote}</p>
      <fieldset disabled={disabled} className="save-editor-fields">
        <legend>{words.rawPokemonValues}</legend>
        <label className="field">
          <span>{words.pidHex}</span>
          <input
            value={pid}
            maxLength={8}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setPid(e.target.value.toUpperCase())}
          />
        </label>
        {pokemon.canEditEncryptionConstant && (
          <label className="field">
            <span>{words.ecHex}</span>
            <input
              value={ec}
              maxLength={8}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setEc(e.target.value.toUpperCase())}
            />
          </label>
        )}
        {pokemon.homeTracker != null && (
          <label className="field">
            <span>{words.homeTrackerHex}</span>
            <input
              value={tracker}
              maxLength={16}
              spellCheck={false}
              autoComplete="off"
              onChange={(event) => setTracker(event.target.value)}
              onBlur={() => setTracker(normalizeHomeTracker(tracker))}
            />
          </label>
        )}
      </fieldset>
      {pokemon.homeTracker != null && (
        <p className="save-editor-note">{words.homeTrackerNote}</p>
      )}
      {error && (
        <p role="alert" className="save-editor-error">
          {error}
        </p>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void apply("values")}
        >
          {words.applyRawValues}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void apply("rerollPid")}
        >
          {words.rerollPid}
        </button>
        {pokemon.canEditEncryptionConstant && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => void apply("rerollEc")}
          >
            {words.rerollEc}
          </button>
        )}
      </div>
    </details>
  );
}
