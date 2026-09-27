import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import { speciesImage } from "./art";
import { localizeSaveError, type saveEditorResources } from "./locales";
import { dex5Labels } from "./gen5PokedexLabels";
import { svDexLabels } from "./svPokedex";
import {
  dex9aShiny,
  validateDex9a,
  zaDexLabels,
  type Dex9aCatalog,
  type Dex9aState,
  type Dex9aEdit,
  type Dex9aAction,
} from "./zaPokedex";

export function ZaPokedexEditor({
  revision,
  busy,
  onRead,
  onApply,
}: {
  revision: number;
  busy: boolean;
  onRead(): Promise<Dex9aCatalog | undefined>;
  onApply(edit: Dex9aEdit): Promise<void>;
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
    sv = svDexLabels[lang],
    za = zaDexLabels[lang];
  const [catalog, setCatalog] = useState<Dex9aCatalog>();
  const [species, setSpecies] = useState(0),
    [draft, setDraft] = useState<Dex9aState>();
  const [action, setAction] = useState<Dex9aAction>("give"),
    [shiny, setShiny] = useState(false),
    [error, setError] = useState("");
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
        setError("");
      }
    });
    return () => {
      active = false;
    };
  }, [revision]);
  const entry =
      catalog?.entries.find((e) => e.state.species === species) ??
      catalog?.entries[0],
    state = draft ?? entry?.state;
  const dirty =
      !!draft && JSON.stringify(draft) !== JSON.stringify(entry?.state),
    disabled = busy || !catalog?.canEdit;
  const fail = (e: unknown) =>
    setError(
      localizeSaveError(e instanceof Error ? e.message : String(e), words),
    );
  const apply = async (edit: Dex9aEdit) => {
    setError("");
    try {
      await onApply(edit);
    } catch (e) {
      fail(e);
    }
  };
  const actions: [Dex9aAction, string][] = [
    ["give", labels.give],
    ["complete", labels.complete],
    ["seen", labels.seenAll],
    ["clear", sv.clear],
    ["caught", labels.caught],
    ["uncaught", labels.uncaught],
  ];
  return (
    <section aria-label={words.pokedexTitle}>
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
          <label className="field">
            <span>{labels.species}</span>
            <Select
              value={entry?.state.species ?? 0}
              disabled={busy || dirty}
              onChange={(e) => {
                setSpecies(Number(e.target.value));
                setDraft(undefined);
                setError("");
              }}
            >
              {catalog.entries.map((e) => (
                <option key={e.state.species} value={e.state.species}>
                  {e.number || "—"} · {e.name[lang]}
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
                  src={speciesImage(state.species)}
                  alt=""
                />
                <strong>{entry.name[lang]}</strong>
              </div>
              <fieldset disabled={disabled}>
                <legend>{labels.seen}</legend>
                <div className="save-editor-toolbar">
                  <Flag
                    label={sv.isNew}
                    value={state.isNew}
                    onChange={(isNew) => setDraft({ ...state, isNew })}
                  />
                  <Flag
                    label={za.alpha}
                    value={state.alpha}
                    onChange={(alpha) => setDraft({ ...state, alpha })}
                  />
                  {sv.genders.map((label, i) => (
                    <Flag
                      key={i}
                      label={label}
                      value={state.genders[i]}
                      onChange={(value) => {
                        const genders = [...state.genders];
                        genders[i] = value;
                        setDraft({ ...state, genders });
                      }}
                    />
                  ))}
                </div>
              </fieldset>
              <fieldset disabled={disabled}>
                <legend>{za.mega}</legend>
                <div className="save-editor-toolbar">
                  {entry.megaChoices.map((label, i) => (
                    <Flag
                      key={i}
                      label={label[lang]}
                      value={state.mega[i]}
                      onChange={(value) => {
                        const mega = [...state.mega];
                        mega[i] = value;
                        setDraft({ ...state, mega });
                      }}
                    />
                  ))}
                </div>
              </fieldset>
              <fieldset disabled={disabled}>
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
                    za.latam,
                  ].map((name, i) => (
                    <Flag
                      key={i}
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
              <fieldset disabled={disabled}>
                <legend>{labels.display}</legend>
                <div className="save-editor-toolbar">
                  <label className="field">
                    <span>{sv.form}</span>
                    <Select
                      value={state.displayForm}
                      onChange={(e) =>
                        setDraft({
                          ...state,
                          displayForm: Number(e.target.value),
                        })
                      }
                    >
                      {entry.formChoices.map((name, i) => (
                        <option key={i} value={i}>
                          {i} · {name[lang]}
                        </option>
                      ))}
                      {state.displayForm > 31 && (
                        <option value={state.displayForm}>
                          {labels.unknown} · {state.displayForm}
                        </option>
                      )}
                    </Select>
                  </label>
                  <label className="field">
                    <span>{sv.gender}</span>
                    <Select
                      value={state.displayGender}
                      onChange={(e) =>
                        setDraft({
                          ...state,
                          displayGender: Number(e.target.value),
                        })
                      }
                    >
                      {za.displayGenders.map((name, i) => (
                        <option key={i} value={i}>
                          {name}
                        </option>
                      ))}
                      {state.displayGender > 3 && (
                        <option value={state.displayGender}>
                          {labels.unknown} · {state.displayGender}
                        </option>
                      )}
                    </Select>
                  </label>
                  <Flag
                    label={sv.shiny}
                    value={state.displayShiny}
                    onChange={(displayShiny) =>
                      setDraft({ ...state, displayShiny })
                    }
                  />
                </div>
              </fieldset>
              <fieldset disabled={disabled}>
                <legend>{labels.forms}</legend>
                <details className="save-pokemon-editor">
                  <summary>{labels.forms} · 32</summary>
                  <div
                    className="save-inventory-table"
                    role="region"
                    aria-label={labels.forms}
                    tabIndex={0}
                  >
                    <table>
                      <thead>
                        <tr>
                          <th>{labels.forms}</th>
                          {za.columns.map((label) => (
                            <th key={label}>{label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {entry.formChoices.map((label, f) => (
                          <tr key={f}>
                            <td>
                              {f} · {label[lang]}
                            </td>
                            {state.forms.map((row, r) => (
                              <td key={r}>
                                <Flag
                                  hideText
                                  label={`${f} · ${za.columns[r]}`}
                                  value={row[f]}
                                  onChange={(value) => {
                                    const forms = state.forms.map((row) => [
                                      ...row,
                                    ]);
                                    forms[r][f] = value;
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
                </details>
              </fieldset>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  className="primary"
                  disabled={disabled || !dirty}
                  onClick={() => {
                    try {
                      void apply(validateDex9a(state, entry));
                    } catch (e) {
                      fail(e);
                    }
                  }}
                >
                  {words.pokedexApply}
                </button>
                <button
                  type="button"
                  disabled={busy || !dirty}
                  onClick={() => {
                    setDraft(undefined);
                    setError("");
                  }}
                >
                  {labels.reset}
                </button>
              </div>
            </>
          )}
          {dirty && <p role="status">{labels.dirty}</p>}
          <fieldset disabled={disabled || dirty || !entry}>
            <legend>{labels.action}</legend>
            <label className="field">
              <span>{labels.action}</span>
              <Select
                value={action}
                onChange={(e) => setAction(e.target.value as Dex9aAction)}
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
                label={labels.shiny}
                value={dex9aShiny(action) && shiny}
                disabled={!dex9aShiny(action)}
                onChange={setShiny}
              />
              <button
                type="button"
                onClick={() =>
                  void apply({
                    action,
                    species: action === "give" ? entry!.state.species : 0,
                    shiny: dex9aShiny(action) && shiny,
                  })
                }
              >
                {labels.run}
              </button>
            </div>
          </fieldset>
          <p className="save-editor-note">{za.note}</p>
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
