import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import { speciesImage } from "./art";
import { localizeSaveError, type saveEditorResources } from "./locales";
import { dex6Labels, validateDex6 } from "./gen6Pokedex";
import { dex5Labels } from "./gen5PokedexLabels";
import {
  dex5Shiny,
  dex5Languages,
  toggleDex5Region,
  toggleDex5Form,
  validateDex5,
  type Dex5Catalog,
  type Dex5Edit,
  type Dex5State,
  type Dex5Globals,
  type Dex5Action,
} from "./gen5Pokedex";
export function FlagPokedexEditor({
  kind = "gen5",
  revision,
  busy,
  saveLanguage,
  onRead,
  onApply,
}: {
  kind?: "gen5" | "xy" | "oras";
  revision: number;
  busy: boolean;
  saveLanguage: number;
  onRead(): Promise<Dex5Catalog | undefined>;
  onApply(edit: Dex5Edit): Promise<void>;
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
  const labels = dex5Labels[lang];
  const six = dex6Labels[lang];
  const gen6 = kind !== "gen5";
  const languageMax = gen6 ? 721 : 493;
  const [catalog, setCatalog] = useState<Dex5Catalog>();
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState<Dex5State>();
  const [globalDraft, setGlobalDraft] = useState<Dex5Globals>();
  const [action, setAction] = useState<Dex5Action>("give");
  const [shiny, setShiny] = useState(false);
  const [allLanguages, setAllLanguages] = useState(false);
  const [error, setError] = useState("");
  const reader = useRef(onRead);
  useEffect(() => {
    reader.current = onRead;
  }, [onRead]);
  useEffect(() => {
    let active = true;
    void reader.current().then((value) => {
      if (active) {
        setCatalog(value);
        setDraft(undefined);
        setGlobalDraft(undefined);
        setError("");
      }
    });
    return () => {
      active = false;
    };
  }, [revision]);
  const initial = catalog?.globals.initialSpecies ?? 1;
  const species =
    selected || (initial >= 1 && initial <= (gen6 ? 721 : 649) ? initial : 1);
  const entry = catalog?.entries.find((e) => e.state.species === species);
  const state = draft ?? entry?.state;
  const globals = globalDraft ?? catalog?.globals;
  const entryDirty =
    !!draft && JSON.stringify(draft) !== JSON.stringify(entry?.state);
  const globalsDirty =
    !!globalDraft &&
    JSON.stringify(globalDraft) !== JSON.stringify(catalog?.globals);
  const dirty = entryDirty || globalsDirty;
  const disabled = busy || !catalog?.canEdit;
  const apply = async (edit: Dex5Edit) => {
    setError("");
    try {
      await onApply(edit);
    } catch (e) {
      setError(
        localizeSaveError(e instanceof Error ? e.message : String(e), words),
      );
    }
  };
  const actions: [Dex5Action, string][] = [
    ["give", labels.give],
    ["giveNone", labels.giveNone],
    ["complete", labels.complete],
    ["seen", labels.seenAll],
    ["clear", labels.clear],
    ["caught", labels.caught],
    ["uncaught", labels.uncaught],
    ["formsClear", labels.formsClear],
    ["formsFirst", labels.formsFirst],
    ["formsAll", labels.formsAll],
  ];
  if (kind === "oras")
    actions.push(
      ["dexNavAll", six.dexNavAll],
      ["dexNavClear", six.dexNavClear],
    );
  return (
    <section>
      <h3>{words.pokedexTitle}</h3>
      {!catalog || !globals ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onRead().then(setCatalog)}
        >
          {words.pokedexRead}
        </button>
      ) : (
        <>
          <details>
            <summary>{labels.globals}</summary>
            <fieldset
              disabled={disabled || entryDirty}
              className="save-editor-fields"
            >
              <Flag
                label={labels.unlocked}
                value={globals.unlocked}
                onChange={(unlocked) =>
                  setGlobalDraft({
                    ...globals,
                    unlocked,
                    nationalMode: unlocked,
                  })
                }
              />
              <Flag
                label={labels.mode}
                value={globals.nationalMode}
                onChange={(nationalMode) =>
                  setGlobalDraft({ ...globals, nationalMode })
                }
              />
              <label className="field">
                <span>{labels.initial}</span>
                <Select
                  value={globals.initialSpecies}
                  onChange={(e) =>
                    setGlobalDraft({
                      ...globals,
                      initialSpecies: Number(e.target.value),
                    })
                  }
                >
                  {!catalog.entries.some(
                    (e) => e.state.species === globals.initialSpecies,
                  ) && (
                    <option value={globals.initialSpecies}>
                      {labels.unknown} · {globals.initialSpecies}
                    </option>
                  )}
                  {catalog.entries.map((e) => (
                    <option key={e.state.species} value={e.state.species}>
                      {e.state.species} · {e.name[lang]}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>{labels.spinda}</span>
                <input
                  type="text"
                  maxLength={gen6 ? 32767 : 8}
                  spellCheck={false}
                  value={globals.spinda}
                  onChange={(e) =>
                    setGlobalDraft({
                      ...globals,
                      spinda: e.target.value.toUpperCase(),
                    })
                  }
                />
              </label>
              <p className="save-editor-note">{gen6 ? six.hex : labels.hex}</p>
            </fieldset>
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={disabled || entryDirty || !globalsDirty}
                onClick={() => void apply({ action: "globals", globals })}
              >
                {labels.applyGlobals}
              </button>
              <button
                type="button"
                disabled={busy || !globalsDirty}
                onClick={() => setGlobalDraft(undefined)}
              >
                {labels.reset}
              </button>
            </div>
          </details>
          <label className="field">
            <span>{labels.species}</span>
            <Select
              disabled={busy || dirty}
              value={species}
              onChange={(e) => {
                setSelected(Number(e.target.value));
                setDraft(undefined);
                setError("");
              }}
            >
              {catalog.entries.map((e) => (
                <option key={e.state.species} value={e.state.species}>
                  {String(e.state.species).padStart(3, "0")} · {e.name[lang]}
                </option>
              ))}
            </Select>
          </label>
          {entry && state && (
            <>
              <div className="save-editor-toolbar">
                <img
                  width={40}
                  height={40}
                  src={speciesImage(species)}
                  alt=""
                />
                <strong>{entry.name[lang]}</strong>
                <Flag
                  disabled={disabled || globalsDirty}
                  label={words.pokedexCaught}
                  value={state.caught}
                  onChange={(caught) => setDraft({ ...state, caught })}
                />
              </div>
              <div className="save-pokedex-table-wrap">
                <table className="save-inventory-table">
                  <thead>
                    <tr>
                      <th scope="col">{words.pokemon}</th>
                      <th scope="col">{labels.seen}</th>
                      <th scope="col">{labels.display}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labels.regions.map((name, index) => (
                      <tr key={name}>
                        <th scope="row">{name}</th>
                        {[false, true].map((display) => (
                          <td key={String(display)}>
                            <Flag
                              disabled={
                                disabled ||
                                globalsDirty ||
                                !entry.allowedRegions[index]
                              }
                              label={
                                name +
                                " · " +
                                (display ? labels.display : labels.seen)
                              }
                              hideText
                              value={
                                (display ? state.displayed : state.seen)[index]
                              }
                              onChange={(value) =>
                                setDraft(
                                  toggleDex5Region(
                                    state,
                                    index,
                                    display,
                                    value,
                                  ),
                                )
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {gen6 && state.foreign != null && (
                <Flag
                  disabled={disabled || globalsDirty}
                  label={six.foreign}
                  value={state.foreign}
                  onChange={(foreign) => setDraft({ ...state, foreign })}
                />
              )}
              {kind === "oras" && (
                <fieldset
                  disabled={disabled || globalsDirty}
                  className="save-editor-fields"
                >
                  <label className="field">
                    <span>{six.countSeen}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={state.countSeen ?? ""}
                      onChange={(e) =>
                        setDraft({ ...state, countSeen: e.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>{six.countObtained}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={state.countObtained ?? ""}
                      onChange={(e) =>
                        setDraft({ ...state, countObtained: e.target.value })
                      }
                    />
                  </label>
                  <p className="save-editor-note">{six.counts}</p>
                </fieldset>
              )}
              <fieldset
                disabled={disabled || globalsDirty || species > languageMax}
              >
                <legend>{labels.languages}</legend>
                <div className="save-editor-toolbar">
                  {[
                    "日本語",
                    "English",
                    "Français",
                    "Italiano",
                    "Deutsch",
                    "Español",
                    "한국어",
                  ].map((name, index) => (
                    <Flag
                      key={name}
                      label={name}
                      value={state.languages[index]}
                      onChange={(value) => {
                        const languages = [...state.languages];
                        languages[index] = value;
                        setDraft({ ...state, languages });
                      }}
                    />
                  ))}
                </div>
              </fieldset>
              {species > languageMax && (
                <p className="save-editor-note">{labels.noLanguages}</p>
              )}
              {!!entry.formChoices.length && (
                <>
                  <h4>{labels.forms}</h4>
                  <div className="save-pokedex-table-wrap">
                    <table className="save-inventory-table">
                      <thead>
                        <tr>
                          <th scope="col">{labels.forms}</th>
                          {labels.formColumns.map((name) => (
                            <th key={name} scope="col">
                              {name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {entry.formChoices.map((name, index) => (
                          <tr key={index}>
                            <th scope="row">{name[lang]}</th>
                            {labels.formColumns.map((column, region) => (
                              <td key={column}>
                                <Flag
                                  disabled={disabled || globalsDirty}
                                  label={name[lang] + " · " + column}
                                  hideText
                                  value={state.forms[region][index]}
                                  onChange={(value) =>
                                    setDraft(
                                      toggleDex5Form(
                                        state,
                                        region,
                                        index,
                                        value,
                                      ),
                                    )
                                  }
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  className="primary"
                  disabled={
                    disabled ||
                    globalsDirty ||
                    (!entryDirty && species === catalog.globals.initialSpecies)
                  }
                  onClick={() => {
                    try {
                      void apply(
                        gen6
                          ? validateDex6(state, entry, kind === "oras")
                          : validateDex5(state, entry),
                      );
                    } catch (e) {
                      setError(
                        localizeSaveError(
                          e instanceof Error ? e.message : String(e),
                          words,
                        ),
                      );
                    }
                  }}
                >
                  {words.pokedexApply}
                </button>
                <button
                  type="button"
                  disabled={busy || !entryDirty}
                  onClick={() => setDraft(undefined)}
                >
                  {labels.reset}
                </button>
              </div>
            </>
          )}
          {dirty && <p role="status">{labels.dirty}</p>}
          <fieldset disabled={disabled || dirty}>
            <legend>{labels.action}</legend>
            <label className="field">
              <span>{labels.action}</span>
              <Select
                value={action}
                onChange={(e) => setAction(e.target.value as Dex5Action)}
              >
                {actions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            <div className="save-editor-toolbar">
              <Flag
                disabled={!dex5Shiny(action)}
                label={labels.shiny}
                value={dex5Shiny(action) && shiny}
                onChange={setShiny}
              />
              <Flag
                disabled={!dex5Languages(action)}
                label={labels.allLanguages}
                value={dex5Languages(action) && allLanguages}
                onChange={setAllLanguages}
              />
              <button
                type="button"
                onClick={() =>
                  void apply({
                    action,
                    species:
                      action === "give" || action === "giveNone" ? species : 0,
                    shiny: dex5Shiny(action) && shiny,
                    allLanguages: dex5Languages(action) && allLanguages,
                  })
                }
              >
                {labels.run}
              </button>
            </div>
          </fieldset>
          <p className="save-editor-note">
            {kind === "xy"
              ? six.noteXY
              : kind === "oras"
                ? six.noteOR
                : labels.note}
          </p>
          {saveLanguage === 8 && (
            <p className="save-editor-note">{labels.korean}</p>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="save-editor-error">
          {error}
        </p>
      )}
    </section>
  );
}
function Flag({
  label,
  value,
  disabled,
  hideText,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled?: boolean;
  hideText?: boolean;
  onChange(value: boolean): void;
}) {
  return (
    <label className="save-pokedex-check">
      <input
        type="checkbox"
        checked={value}
        disabled={disabled}
        aria-label={hideText ? label : undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
      {!hideText && label}
    </label>
  );
}
