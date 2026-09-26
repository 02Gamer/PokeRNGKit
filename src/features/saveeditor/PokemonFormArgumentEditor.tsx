import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import type { PokemonEntry, PokemonPosition, PokemonRawEdit } from "./domain";
import type { saveEditorResources } from "./locales";

export function PokemonFormArgumentEditor({
  argument,
  position,
  disabled,
  onApply,
}: {
  argument: NonNullable<PokemonEntry["formArgument"]>;
  position: PokemonPosition;
  disabled: boolean;
  onApply(edit: PokemonRawEdit): Promise<void>;
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
  const [values, setValues] = useState({
    value: String(argument.value),
    remain: String(argument.remain),
    elapsed: String(argument.elapsed),
    maximum: String(argument.maximum),
  });
  const [error, setError] = useState("");
  const single = argument.mode === "Raw" || argument.mode === "Named";
  const counters = (
    [
      ["remain", words.formRemain, argument.canRemain],
      ["elapsed", words.formElapsed, argument.canElapsed],
      ["maximum", words.formMaximum, argument.canMaximum],
    ] as const
  ).filter((entry) => entry[2]);
  const integer = (value: string, max: number) => {
    if (!/^\d+$/.test(value) || Number(value) > max)
      throw Error(words.pokemonValueError);
    return Number(value);
  };
  const apply = async () => {
    setError("");
    try {
      const formArgument: NonNullable<PokemonRawEdit["formArgument"]> = {};
      if (single) formArgument.value = integer(values.value, argument.max);
      else
        for (const [key] of counters)
          formArgument[key] = integer(values[key], 255);
      await onApply({
        box: position.box,
        slot: position.slot,
        action: "formArgument",
        formArgument,
      });
    } catch {
      setError(words.pokemonValueError);
    }
  };
  return (
    <details className="save-pokemon-editor">
      <summary>{words.formArgument}</summary>
      <p className="save-editor-note">{words.formArgumentNote}</p>
      {argument.mode === "TripleParty" && position.box >= 0 && (
        <p className="save-editor-note">{words.formPartyOnlyNote}</p>
      )}
      <fieldset disabled={disabled} className="save-editor-fields">
        <legend>{words.formArgument}</legend>
        {argument.mode === "Named" && (
          <label className="field">
            <span>{words.formDecoration}</span>
            <Select
              disabled={disabled}
              value={values.value}
              onChange={(e) => setValues({ ...values, value: e.target.value })}
            >
              {!argument.choices[Number(values.value)] && (
                <option value={values.value}>#{values.value}</option>
              )}
              {argument.choices.map((name, id) => (
                <option key={id} value={id}>
                  {name[lang]}
                </option>
              ))}
            </Select>
          </label>
        )}
        {argument.mode === "Raw" && (
          <label className="field">
            <span>{words.formCounter}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={argument.max}
              step={1}
              value={values.value}
              onChange={(e) => setValues({ ...values, value: e.target.value })}
            />
          </label>
        )}
        {counters.map(([key, label]) => (
          <label className="field" key={key}>
            <span>{label}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={255}
              step={1}
              value={values[key]}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
            />
          </label>
        ))}
      </fieldset>
      {error && (
        <p className="save-editor-error" role="alert">
          {error}
        </p>
      )}
      {(single || counters.length > 0) && (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={disabled}
            onClick={() => void apply()}
          >
            {words.applyFormArgument}
          </button>
        </div>
      )}
    </details>
  );
}
