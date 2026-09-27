import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import type { PokemonEntry } from "./domain";
import type {
  GbSpecialEdit,
  GbSpecialFields,
  GbSpecialInfo,
} from "./standalonePokemon";
import { gbSpecialWords } from "./gbSpecialWords";
import { saveEditorResources } from "./locales";

const maximum: Record<keyof GbSpecialFields, number> = {
  catchRate: 255,
  type1: 255,
  type2: 255,
  metLevel: 63,
  metLocation: 127,
  metTimeOfDay: 3,
  trainerGender: 1,
  pokerusStrain: 15,
  pokerusDays: 15,
};

export function StandaloneGbSpecialEditor({
  info,
  pokemon,
  disabled,
  initialLanguage,
  onApply,
}: {
  info: GbSpecialInfo;
  pokemon: PokemonEntry;
  disabled: boolean;
  initialLanguage?: number;
  onApply(edit: GbSpecialEdit): Promise<void>;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const words = gbSpecialWords[lang],
    common = saveEditorResources[lang];
  const keys = (Object.keys(info.fields) as (keyof GbSpecialFields)[]).filter(
    (k) => info.fields[k] != null,
  );
  const [draft, setDraft] = useState(
    () =>
      Object.fromEntries(
        keys.map((k) => [k, String(info.fields[k])]),
      ) as Record<keyof GbSpecialFields, string>,
  );
  const [language, setLanguage] = useState(
    String(
      info.languages.some((c) => c.id === initialLanguage)
        ? initialLanguage
        : info.language,
    ),
  );
  const [cycles, setCycles] = useState(String(pokemon.friendship));
  const [error, setError] = useState<"invalid" | "cycleError">();
  const gen2 = info.fields.metLevel != null;
  const changed = keys.some((k) => draft[k] !== String(info.fields[k]));
  const choices = (key: keyof GbSpecialFields) => {
    if (key === "type1" || key === "type2")
      return info.types.map((c) => ({ id: c.id, name: c.name[lang] }));
    if (key === "metLocation")
      return info.locations.map((c) => ({ id: c.id, name: c.name[lang] }));
    if (key === "metTimeOfDay")
      return words.times.map((name, id) => ({ id, name }));
    if (key === "trainerGender")
      return [common.male, common.female].map((name, id) => ({ id, name }));
    if (key === "pokerusDays")
      return Array.from(
        {
          length: (info.pokerusDurations[Number(draft.pokerusStrain)] ?? 0) + 1,
        },
        (_, id) => ({ id, name: String(id) }),
      );
    return undefined;
  };
  const apply = async () => {
    setError(undefined);
    const fields: GbSpecialFields = {};
    for (const key of keys) {
      const value = Number(draft[key]);
      const list = choices(key);
      if (
        !/^\d+$/.test(draft[key]) ||
        value > maximum[key] ||
        (list &&
          value !== info.fields[key] &&
          !list.some((c) => c.id === value))
      ) {
        setError("invalid");
        return;
      }
      fields[key] = value;
    }
    if (
      gen2 &&
      (fields.pokerusStrain !== info.fields.pokerusStrain ||
        fields.pokerusDays !== info.fields.pokerusDays) &&
      (fields.pokerusDays ?? 0) >
        (info.pokerusDurations[fields.pokerusStrain ?? 0] ?? 0)
    ) {
      setError("invalid");
      return;
    }
    await onApply({ action: "fields", fields });
  };
  const applyCycles = async () => {
    setError(undefined);
    if (!/^\d+$/.test(cycles) || Number(cycles) > 255) {
      setError("cycleError");
      return;
    }
    await onApply({
      action: "egg",
      egg: { action: "cycles", cycles: Number(cycles) },
    });
  };
  return (
    <>
      <details className="save-pokemon-editor">
        <summary>{words.title}</summary>
        <p className="save-editor-note">
          {gen2 ? words.note : words.firstNote}
        </p>
        <div className="save-editor-fields">
          {keys.map((key) => {
            const list = choices(key);
            const max = maximum[key];
            return (
              <label className="field" key={key}>
                <span>{words[key]}</span>
                {list ? (
                  <Select
                    value={draft[key]}
                    disabled={disabled}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value })
                    }
                  >
                    {!list.some((c) => c.id === Number(draft[key])) && (
                      <option value={draft[key]}>
                        {words.current}: {draft[key]}
                      </option>
                    )}
                    {list.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <input
                    type="number"
                    disabled={disabled}
                    min={0}
                    max={max}
                    step={1}
                    value={draft[key]}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value })
                    }
                  />
                )}
              </label>
            );
          })}
        </div>
        {gen2 && <p className="save-editor-note">{words.virusNote}</p>}
        {error === "invalid" && (
          <p className="save-editor-error" role="alert">
            {words.invalid}
          </p>
        )}
        <div className="save-editor-toolbar">
          {!gen2 && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setDraft({ ...draft, catchRate: "0" })}
            >
              {words.clearRate}
            </button>
          )}
          <button
            type="button"
            disabled={disabled || !changed}
            onClick={() => void apply()}
          >
            {words.apply}
          </button>
        </div>
      </details>
      <details className="save-pokemon-editor">
        <summary>{gen2 ? words.naming : words.nameOnly}</summary>
        <p className="save-editor-note">{words.nameNote}</p>
        <div className="save-editor-fields">
          <label className="field">
            <span>{words.language}</span>
            <Select
              disabled={disabled}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {info.languages.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name[lang]}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              void onApply({
                action: "speciesName",
                language: Number(language),
              })
            }
          >
            {words.restoreName}
          </button>
        </div>
        {gen2 && (
          <>
            <p className="save-editor-note">{words.eggNote}</p>
            {pokemon.egg && (
              <>
                <div className="save-editor-fields">
                  <label className="field">
                    <span>{common.hatchCounter}</span>
                    <input
                      type="number"
                      min={0}
                      max={255}
                      step={1}
                      disabled={disabled}
                      value={cycles}
                      onChange={(e) => setCycles(e.target.value)}
                    />
                  </label>
                </div>
                {error === "cycleError" && (
                  <p className="save-editor-error" role="alert">
                    {words.cycleError}
                  </p>
                )}
                <div className="save-editor-toolbar">
                  <button
                    type="button"
                    disabled={disabled || cycles === String(pokemon.friendship)}
                    onClick={() => void applyCycles()}
                  >
                    {common.applyHatchCounter}
                  </button>
                </div>
              </>
            )}
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  void onApply({
                    action: "egg",
                    egg: { action: pokemon.egg ? "hatch" : "makeEgg" },
                    language: Number(language),
                  })
                }
              >
                {pokemon.egg ? common.hatchEgg : common.makeEgg}
              </button>
            </div>
          </>
        )}
      </details>
    </>
  );
}
