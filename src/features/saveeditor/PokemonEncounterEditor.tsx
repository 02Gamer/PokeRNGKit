import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PokemonEntry, PokemonPosition, PokemonRawEdit } from "./domain";
import type { saveEditorResources } from "./locales";

export function PokemonEncounterEditor({
  encounter,
  position,
  disabled,
  onApply,
}: {
  encounter: PokemonEntry["encounter"];
  position: PokemonPosition;
  disabled: boolean;
  onApply(edit: PokemonRawEdit): Promise<void>;
}) {
  const { t } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const [level, setLevel] = useState(String(encounter.metLevel));
  const [fateful, setFateful] = useState(encounter.fateful);
  const [dates, setDates] = useState({
    metDate: encounter.metDate,
    eggDate: encounter.eggDate,
  });
  const [error, setError] = useState("");
  const changed =
    level !== String(encounter.metLevel) ||
    fateful !== encounter.fateful ||
    dates.metDate !== encounter.metDate ||
    dates.eggDate !== encounter.eggDate;
  const apply = async () => {
    setError("");
    try {
      if (!/^\d+$/.test(level) || Number(level) > encounter.maxMetLevel)
        throw Error();
      const edit: NonNullable<PokemonRawEdit["encounter"]> = {};
      if (Number(level) !== encounter.metLevel) edit.metLevel = Number(level);
      if (fateful !== encounter.fateful) edit.fateful = fateful;
      if (encounter.canDates)
        for (const key of ["metDate", "eggDate"] as const) {
          const value = dates[key];
          if (
            value !== "" &&
            (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
              value < "2000-01-01" ||
              value > "2099-12-31" ||
              !Number.isFinite(Date.parse(value)) ||
              new Date(value).toISOString().slice(0, 10) !== value)
          )
            throw Error();
          if (value !== encounter[key]) edit[key] = value;
        }
      if (Object.keys(edit).length === 0) return;
      await onApply({ ...position, action: "encounter", encounter: edit });
    } catch {
      setError(words.pokemonValueError);
    }
  };
  return (
    <details className="save-pokemon-editor">
      <summary>{words.encounterDetails}</summary>
      <p className="save-editor-note">{words.encounterDetailsNote}</p>
      <fieldset disabled={disabled} className="save-editor-fields">
        <legend>{words.encounterDetails}</legend>
        <label className="field">
          <span>{words.metLevel}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={encounter.maxMetLevel}
            step={1}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          />
        </label>
        {encounter.canDates &&
          (["metDate", "eggDate"] as const).map((key) => (
            <label className="field" key={key}>
              <span>{words[key]}</span>
              <input
                type="date"
                min="2000-01-01"
                max="2099-12-31"
                value={dates[key]}
                onChange={(e) => setDates({ ...dates, [key]: e.target.value })}
              />
            </label>
          ))}
        <label className="save-editor-checkbox">
          <span>{words.fatefulEncounter}</span>
          <input
            type="checkbox"
            checked={fateful}
            onChange={(e) => setFateful(e.target.checked)}
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
          disabled={disabled || !changed}
          onClick={() => void apply()}
        >
          {words.applyEncounterDetails}
        </button>
      </div>
    </details>
  );
}
