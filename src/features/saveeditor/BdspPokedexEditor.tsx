import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import { speciesImage } from "./art";
import { localizeSaveError, type saveEditorResources } from "./locales";
import { dex5Labels } from "./gen5PokedexLabels";
import {
  bdspDexLabels,
  dex8bShiny,
  dex8bSingle,
  validateDex8b,
  type Dex8bCatalog,
  type Dex8bState,
  type Dex8bEdit,
  type Dex8bAction,
} from "./bdspPokedex";
export function BdspPokedexEditor({
  revision,
  busy,
  onRead,
  onApply,
}: {
  revision: number;
  busy: boolean;
  onRead(): Promise<Dex8bCatalog | undefined>;
  onApply(edit: Dex8bEdit): Promise<void>;
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
  const labels = dex5Labels[lang],
    bdsp = bdspDexLabels[lang];
  const [catalog, setCatalog] = useState<Dex8bCatalog>();
  const [species, setSpecies] = useState(1);
  const [draft, setDraft] = useState<Dex8bState>();
  const [nationalDraft, setNationalDraft] = useState<boolean>();
  const [action, setAction] = useState<Dex8bAction>("give");
  const [shiny, setShiny] = useState(false);
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
        setNationalDraft(undefined);
        setError("");
      }
    });
    return () => {
      active = false;
    };
  }, [revision]);
  const entry = catalog?.entries.find((e) => e.state.species === species);
  const state = draft ?? entry?.state;
  const national = nationalDraft ?? catalog?.national ?? false;
  const entryDirty =
    !!draft && JSON.stringify(draft) !== JSON.stringify(entry?.state);
  const globalDirty =
    nationalDraft !== undefined && nationalDraft !== catalog?.national;
  const dirty = entryDirty || globalDirty;
  const disabled = busy || !catalog?.canEdit;
  const fail = (e: unknown) =>
    setError(
      localizeSaveError(e instanceof Error ? e.message : String(e), words),
    );
  const apply = async (edit: Dex8bEdit) => {
    setError("");
    try {
      await onApply(edit);
    } catch (e) {
      fail(e);
    }
  };
  const actions: [Dex8bAction, string][] = [
    ["give", bdsp.give],
    ["giveNone", bdsp.giveNone],
    ["complete", labels.complete],
    ["seen", labels.seenAll],
    ["clear", bdsp.clear],
    ["caught", labels.caught],
    ["uncaught", labels.uncaught],
  ];
  if (entry?.formChoices.length)
    actions.push(
      ["formsClear", bdsp.formsClear],
      ["formsRegular", bdsp.formsRegular],
      ["formsShiny", bdsp.formsShiny],
    );
  return (
    <section>
      <h3>{words.pokedexTitle}</h3>
      {!catalog ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onRead().then(setCatalog)}
        >
          {words.pokedexRead}
        </button>
      ) : (
        <>
          <div className="save-editor-toolbar">
            <Flag
              disabled={disabled || entryDirty}
              label={bdsp.national}
              value={national}
              onChange={setNationalDraft}
            />
            <button
              type="button"
              disabled={disabled || entryDirty || !globalDirty}
              onClick={() => void apply({ action: "national", national })}
            >
              {labels.applyGlobals}
            </button>
            <button
              type="button"
              disabled={busy || !globalDirty}
              onClick={() => setNationalDraft(undefined)}
            >
              {labels.reset}
            </button>
          </div>
          <label className="field">
            <span>{labels.species}</span>
            <Select
              value={species}
              disabled={busy || dirty}
              onChange={(e) => {
                setSpecies(Number(e.target.value));
                setDraft(undefined);
                setAction("give");
                setError("");
              }}
            >
              {catalog.entries.map((e) => (
                <option key={e.state.species} value={e.state.species}>
                  {e.state.species} · {e.name[lang]}
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
              </div>
              <fieldset disabled={disabled || globalDirty}>
                <label className="field">
                  <span>{bdsp.state}</span>
                  <Select
                    value={state.state}
                    onChange={(e) =>
                      setDraft({ ...state, state: Number(e.target.value) })
                    }
                  >
                    {(state.state < 0 || state.state > 3) && (
                      <option value={state.state}>
                        {labels.unknown} · {state.state}
                      </option>
                    )}
                    {bdsp.states.map((name, i) => (
                      <option key={i} value={i}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </label>
                <div className="save-editor-toolbar">
                  {bdsp.regions.map((name, i) => (
                    <Flag
                      key={name}
                      label={name}
                      value={state.genders[i]}
                      onChange={(value) => {
                        const genders = [...state.genders];
                        genders[i] = value;
                        setDraft({ ...state, genders });
                      }}
                    />
                  ))}
                </div>
                <fieldset>
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
                      "简体中文",
                      "繁體中文",
                    ].map((name, i) => (
                      <Flag
                        key={name}
                        label={name}
                        value={state.languages[i]}
                        onChange={(value) => {
                          const languages = [...state.languages];
                          languages[i] = value;
                          setDraft({ ...state, languages });
                        }}
                      />
                    ))}
                  </div>
                </fieldset>
                {!!entry.formChoices.length && (
                  <div className="save-pokedex-table-wrap">
                    <table className="save-inventory-table">
                      <thead>
                        <tr>
                          <th scope="col">{labels.forms}</th>
                          <th scope="col">{bdsp.regular}</th>
                          <th scope="col">{bdsp.shiny}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.formChoices.map((name, i) => (
                          <tr key={i}>
                            <th scope="row">{name[lang]}</th>
                            {[0, 1].map((r) => (
                              <td key={r}>
                                <Flag
                                  hideText
                                  label={
                                    name[lang] +
                                    " · " +
                                    (r ? bdsp.shiny : bdsp.regular)
                                  }
                                  value={state.forms[r][i]}
                                  onChange={(value) => {
                                    const forms = state.forms.map((row) => [
                                      ...row,
                                    ]);
                                    forms[r][i] = value;
                                    setDraft({ ...state, forms });
                                  }}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </fieldset>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  className="primary"
                  disabled={disabled || globalDirty || !entryDirty}
                  onClick={() => {
                    try {
                      void apply(validateDex8b(state, entry));
                    } catch (e) {
                      fail(e);
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
                onChange={(e) => setAction(e.target.value as Dex8bAction)}
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
                disabled={!dex8bShiny(action)}
                label={labels.shiny}
                value={dex8bShiny(action) && shiny}
                onChange={setShiny}
              />
              <button
                type="button"
                onClick={() =>
                  void apply({
                    action,
                    species: dex8bSingle(action) ? species : 0,
                    shiny: dex8bShiny(action) && shiny,
                  })
                }
              >
                {labels.run}
              </button>
            </div>
          </fieldset>
          <p className="save-editor-note">{bdsp.note}</p>
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
