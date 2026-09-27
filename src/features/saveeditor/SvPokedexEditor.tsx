import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import { speciesImage } from "./art";
import { localizeSaveError, type saveEditorResources } from "./locales";
import { dex5Labels } from "./gen5PokedexLabels";
import {
  dex9Shiny,
  svDexLabels,
  validateDex9,
  type Dex9Catalog,
  type Dex9Edit,
  type Dex9State,
  type Dex9Action,
} from "./svPokedex";

export function SvPokedexEditor({
  revision,
  busy,
  onRead,
  onApply,
}: {
  revision: number;
  busy: boolean;
  onRead(): Promise<Dex9Catalog | undefined>;
  onApply(edit: Dex9Edit): Promise<void>;
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
    sv = svDexLabels[lang];
  const [catalog, setCatalog] = useState<Dex9Catalog>();
  const [species, setSpecies] = useState(0),
    [draft, setDraft] = useState<Dex9State>();
  const [action, setAction] = useState<Dex9Action>("give"),
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
  const apply = async (edit: Dex9Edit) => {
    setError("");
    try {
      await onApply(edit);
    } catch (e) {
      fail(e);
    }
  };
  const actions: [Dex9Action, string][] = [
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
                  src={speciesImage(state.species)}
                  alt=""
                />
                <strong>{entry.name[lang]}</strong>
                {entry.regions.map((n, i) =>
                  n ? (
                    <span key={i}>
                      {sv.regions[i]} · {n}
                    </span>
                  ) : null,
                )}
              </div>
              <fieldset disabled={disabled}>
                <legend>{labels.seen}</legend>
                <div className="save-editor-toolbar">
                  {state.status !== null && (
                    <label className="field">
                      <span>{sv.state}</span>
                      <Select
                        value={state.status}
                        onChange={(e) =>
                          setDraft({ ...state, status: Number(e.target.value) })
                        }
                      >
                        {sv.states.map((s, i) => (
                          <option key={i} value={i}>
                            {s}
                          </option>
                        ))}
                        {state.status > 3 && (
                          <option value={state.status}>
                            {labels.unknown} · {state.status}
                          </option>
                        )}
                      </Select>
                    </label>
                  )}
                  {state.isNew !== null && (
                    <Flag
                      label={sv.isNew}
                      value={state.isNew}
                      onChange={(isNew) => setDraft({ ...state, isNew })}
                    />
                  )}
                  {sv.genders.map((name, i) => (
                    <Flag
                      key={i}
                      label={name}
                      value={state.genders[i]}
                      onChange={(value) => {
                        const genders = [...state.genders];
                        genders[i] = value;
                        setDraft({ ...state, genders });
                      }}
                    />
                  ))}
                  <Flag
                    label={sv.shiny}
                    value={state.shiny}
                    onChange={(shiny) => setDraft({ ...state, shiny })}
                  />
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
              {state.displays.map((display, r) => (
                <fieldset
                  key={r}
                  disabled={disabled || (catalog.modern && !entry.regions[r])}
                >
                  <legend>
                    {catalog.modern
                      ? `${sv.regions[r]} · ${labels.display}`
                      : labels.display}
                  </legend>
                  <div className="save-editor-toolbar">
                    <label className="field">
                      <span>{sv.form}</span>
                      <Select
                        value={display.form}
                        onChange={(e) => {
                          const displays = state.displays.map((d, i) =>
                            i === r
                              ? { ...d, form: Number(e.target.value) }
                              : d,
                          );
                          setDraft({ ...state, displays });
                        }}
                      >
                        {entry.formChoices.map((name, i) => (
                          <option key={i} value={i}>
                            {i} · {name[lang]}
                          </option>
                        ))}
                        {display.form >= entry.formChoices.length && (
                          <option value={display.form}>
                            {labels.unknown} · {display.form}
                          </option>
                        )}
                      </Select>
                    </label>
                    <label className="field">
                      <span>{sv.gender}</span>
                      <Select
                        value={display.gender}
                        onChange={(e) => {
                          const displays = state.displays.map((d, i) =>
                            i === r
                              ? { ...d, gender: Number(e.target.value) }
                              : d,
                          );
                          setDraft({ ...state, displays });
                        }}
                      >
                        {sv.genders.map((name, i) => (
                          <option key={i} value={i}>
                            {name}
                          </option>
                        ))}
                        {display.gender > 2 && (
                          <option value={display.gender}>
                            {labels.unknown} · {display.gender}
                          </option>
                        )}
                      </Select>
                    </label>
                    <Flag
                      label={sv.shiny}
                      value={display.shiny}
                      onChange={(shiny) => {
                        const displays = state.displays.map((d, i) =>
                          i === r ? { ...d, shiny } : d,
                        );
                        setDraft({ ...state, displays });
                      }}
                    />
                    {state.different !== null && (
                      <Flag
                        label={sv.different}
                        value={state.different}
                        onChange={(different) =>
                          setDraft({ ...state, different })
                        }
                      />
                    )}
                  </div>
                </fieldset>
              ))}
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
                          <th>{sv.form}</th>
                          {state.forms.map((_, r) => (
                            <th key={r}>{sv.columns[r]}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 32 }, (_, f) => (
                          <tr key={f}>
                            <td>
                              {f} · {entry.formChoices[f]?.[lang] ?? sv.unknown}
                            </td>
                            {state.forms.map((row, r) => (
                              <td key={r}>
                                <Flag
                                  hideText
                                  label={`${f} · ${sv.columns[r]}`}
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
                      void apply(validateDex9(state, entry, catalog.modern));
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
                onChange={(e) => setAction(e.target.value as Dex9Action)}
              >
                {actions.map(([value, name]) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </Select>
            </label>
            <div className="save-editor-toolbar">
              <Flag
                label={labels.shiny}
                value={dex9Shiny(action) && shiny}
                disabled={!dex9Shiny(action)}
                onChange={setShiny}
              />
              <button
                type="button"
                onClick={() =>
                  void apply({
                    action,
                    species: action === "give" ? entry!.state.species : 0,
                    shiny: dex9Shiny(action) && shiny,
                  })
                }
              >
                {labels.run}
              </button>
            </div>
          </fieldset>
          <p className="save-editor-note">{sv.note}</p>
          {!catalog.modern && <p className="save-editor-note">{sv.oldNote}</p>}
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
