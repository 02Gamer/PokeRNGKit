import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import { speciesImage } from "./art";
import { localizeSaveError, type saveEditorResources } from "./locales";
import { dex5Labels } from "./gen5PokedexLabels";
import {
  dex7Labels,
  toggleDex7,
  validateDex7,
  type Dex7Catalog,
  type Dex7State,
  type Dex7Edit,
  type Dex7Action,
} from "./gen7Pokedex";
export function Gen7PokedexEditor({
  revision,
  busy,
  onRead,
  onApply,
}: {
  revision: number;
  busy: boolean;
  onRead(): Promise<Dex7Catalog | undefined>;
  onApply(edit: Dex7Edit): Promise<void>;
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
    seven = dex7Labels[lang];
  const [catalog, setCatalog] = useState<Dex7Catalog>();
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState<Dex7State>();
  const [action, setAction] = useState<Dex7Action>("give");
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
        setError("");
      }
    });
    return () => {
      active = false;
    };
  }, [revision]);
  const entry = catalog?.entries.find((e) => e.state.index === selected);
  const state = draft ?? entry?.state;
  const dirty =
    !!draft && JSON.stringify(draft) !== JSON.stringify(entry?.state);
  const disabled = busy || !catalog?.canEdit;
  const apply = async (edit: Dex7Edit) => {
    setError("");
    try {
      await onApply(edit);
    } catch (e) {
      setError(
        localizeSaveError(e instanceof Error ? e.message : String(e), words),
      );
    }
  };
  const actions: [Dex7Action, string][] = [
    ["give", seven.give],
    ["giveNone", seven.giveNone],
    ["complete", labels.complete],
    ["seen", labels.seenAll],
    ["clear", seven.clear],
    ["caught", labels.caught],
    ["uncaught", labels.uncaught],
  ];
  const choose = (index: number) => {
    setSelected(index);
    setDraft(undefined);
    setError("");
  };
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
          <div className="save-editor-fields">
            <label className="field">
              <span>{labels.species}</span>
              <Select
                disabled={busy || dirty}
                value={entry?.species ?? 1}
                onChange={(e) => choose(Number(e.target.value) - 1)}
              >
                {catalog.entries
                  .filter((e) => e.form === 0)
                  .map((e) => (
                    <option key={e.species} value={e.species}>
                      {e.species} · {e.name[lang]}
                    </option>
                  ))}
              </Select>
            </label>
            <label className="field">
              <span>{seven.form}</span>
              <Select
                disabled={busy || dirty}
                value={selected}
                onChange={(e) => choose(Number(e.target.value))}
              >
                {catalog.entries
                  .filter((e) => e.species === entry?.species)
                  .map((e) => (
                    <option key={e.state.index} value={e.state.index}>
                      {e.formName[lang] || seven.base} · {e.form}
                    </option>
                  ))}
              </Select>
            </label>
          </div>
          {entry && state && (
            <>
              <div className="save-editor-toolbar">
                <img
                  width={40}
                  height={40}
                  src={speciesImage(entry.species)}
                  alt=""
                />
                <strong>
                  {entry.name[lang]}
                  {entry.form > 0 ? ` · ${entry.formName[lang]}` : ""}
                </strong>
                {state.caught !== null && (
                  <Flag
                    disabled={disabled}
                    label={words.pokedexCaught}
                    value={state.caught}
                    onChange={(caught) => setDraft({ ...state, caught })}
                  />
                )}
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
                                disabled || !entry.allowedRegions[index]
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
                                  toggleDex7(state, index, display, value),
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
              {state.languages.length > 0 && (
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
              )}
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  className="primary"
                  disabled={disabled || !dirty}
                  onClick={() => {
                    try {
                      void apply(validateDex7(state, entry));
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
                  disabled={busy || !dirty}
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
                onChange={(e) => setAction(e.target.value as Dex7Action)}
              >
                {actions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            <button
              type="button"
              onClick={() =>
                void apply({
                  action,
                  index:
                    action === "give" || action === "giveNone" ? selected : -1,
                })
              }
            >
              {labels.run}
            </button>
          </fieldset>
          <p className="save-editor-note">{seven.note}</p>
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
