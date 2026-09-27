import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import { speciesImage } from "./art";
import { localizeSaveError, type saveEditorResources } from "./locales";
import { dex4Labels } from "./gen4PokedexLabels";
import {
  moveDex4Item,
  toggleDex4Seen,
  validateDex4,
  type Dex4Action,
  type Dex4Catalog,
  type Dex4Edit,
  type Dex4State,
} from "./gen4Pokedex";
export function Gen4PokedexEditor({
  revision,
  busy,
  onRead,
  onApply,
}: {
  revision: number;
  busy: boolean;
  onRead(): Promise<Dex4Catalog | undefined>;
  onApply(edit: Dex4Edit): Promise<void>;
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
  const labels = dex4Labels[lang];
  const [catalog, setCatalog] = useState<Dex4Catalog>();
  const [species, setSpecies] = useState(1);
  const [draft, setDraft] = useState<Dex4State>();
  const [scope, setScope] = useState("one");
  const [action, setAction] = useState<Dex4Action>("complete");
  const [upgrade, setUpgrade] = useState<number>();
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
        setUpgrade(undefined);
        setError("");
      }
    });
    return () => {
      active = false;
    };
  }, [revision]);
  const entry = catalog?.entries.find((e) => e.state.species === species);
  const state = draft ?? entry?.state;
  const dirty =
    !!draft && JSON.stringify(draft) !== JSON.stringify(entry?.state);
  const disabled = busy || !catalog?.canEdit;
  const apply = async (edit: Dex4Edit) => {
    setError("");
    try {
      await onApply(edit);
    } catch (e) {
      setError(
        localizeSaveError(e instanceof Error ? e.message : String(e), words),
      );
    }
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
              <span>{labels.upgrade}</span>
              <Select
                disabled={disabled || dirty}
                value={upgrade ?? catalog.upgrade}
                onChange={(e) => setUpgrade(Number(e.target.value))}
              >
                {catalog.upgrades.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
            <button
              type="button"
              disabled={
                disabled ||
                dirty ||
                (upgrade ?? catalog.upgrade) === catalog.upgrade
              }
              onClick={() =>
                void apply({
                  action: "upgrade",
                  upgrade: upgrade ?? catalog.upgrade,
                })
              }
            >
              {labels.applyUpgrade}
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
                <label className="save-pokedex-check">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={state.seen}
                    onChange={(e) =>
                      setDraft(toggleDex4Seen(state, entry, e.target.checked))
                    }
                  />
                  {words.pokedexSeen}
                </label>
                <label className="save-pokedex-check">
                  <input
                    type="checkbox"
                    disabled={disabled || !state.seen}
                    checked={state.caught}
                    onChange={(e) =>
                      setDraft({ ...state, caught: e.target.checked })
                    }
                  />
                  {words.pokedexCaught}
                </label>
              </div>
              <div className="save-dex4-lists">
                <OrderedList
                  title={labels.genders}
                  values={state.genders}
                  choices={entry.genderChoices.map((id) => ({
                    id,
                    name: id === 0 ? "♂" : id === 1 ? "♀" : labels.genderless,
                  }))}
                  disabled={disabled || !state.seen}
                  labels={labels}
                  onChange={(genders) => setDraft({ ...state, genders })}
                />
                {!!entry.formChoices.length && (
                  <OrderedList
                    title={labels.forms}
                    values={state.forms}
                    choices={entry.formChoices.map((name, id) => ({
                      id,
                      name: name[lang],
                    }))}
                    disabled={disabled || !state.seen}
                    labels={labels}
                    onChange={(forms) => setDraft({ ...state, forms })}
                  />
                )}
              </div>
              <fieldset disabled={disabled || !entry.hasLanguage}>
                <legend>{labels.languages}</legend>
                <div className="save-editor-toolbar">
                  {[
                    "日本語",
                    "English",
                    "Français",
                    "Deutsch",
                    "Italiano",
                    "Español",
                  ].map((name, i) => (
                    <label className="save-pokedex-check" key={name}>
                      <input
                        type="checkbox"
                        checked={state.languages[i]}
                        onChange={(e) => {
                          const languages = [...state.languages];
                          languages[i] = e.target.checked;
                          setDraft({ ...state, languages });
                        }}
                      />
                      {name}
                    </label>
                  ))}
                </div>
              </fieldset>
              {!entry.hasLanguage && (
                <p className="save-editor-note">{labels.noLanguages}</p>
              )}
              {!!entry.formChoices.length && (
                <p className="save-editor-note">{labels.format}</p>
              )}
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  className="primary"
                  disabled={disabled || !dirty}
                  onClick={() => {
                    try {
                      void apply(validateDex4(state, entry));
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
                  {words.pokedexReset}
                </button>
              </div>
            </>
          )}
          {dirty && <p role="status">{labels.dirty}</p>}
          <div className="save-editor-fields">
            <label className="field">
              <span>{labels.scope}</span>
              <Select
                disabled={disabled || dirty}
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              >
                <option value="one">{labels.one}</option>
                <option value="all">{labels.all}</option>
              </Select>
            </label>
            <label className="field">
              <span>{labels.action}</span>
              <Select
                disabled={disabled || dirty}
                value={action}
                onChange={(e) => setAction(e.target.value as Dex4Action)}
              >
                {(
                  ["complete", "seen", "caught", "uncaught", "clear"] as const
                ).map((a) => (
                  <option key={a} value={a}>
                    {labels[a]}
                  </option>
                ))}
              </Select>
            </label>
            <button
              type="button"
              disabled={disabled || dirty}
              onClick={() =>
                void apply({ action, species: scope === "all" ? 0 : species })
              }
            >
              {labels.run}
            </button>
          </div>
          <p className="save-editor-note">{labels.note}</p>
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
function OrderedList({
  title,
  values,
  choices,
  disabled,
  labels,
  onChange,
}: {
  title: string;
  values: number[];
  choices: { id: number; name: string }[];
  disabled: boolean;
  labels: typeof dex4Labels.en;
  onChange(values: number[]): void;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend>{title}</legend>
      <ol className="save-dex4-order">
        {values.map((id, index) => (
          <li key={id}>
            <span>{choices.find((c) => c.id === id)?.name ?? id}</span>
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={disabled || index === 0}
                onClick={() => onChange(moveDex4Item(values, index, -1))}
              >
                {labels.up}
              </button>
              <button
                type="button"
                disabled={disabled || index === values.length - 1}
                onClick={() => onChange(moveDex4Item(values, index, 1))}
              >
                {labels.down}
              </button>
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== id))}
              >
                {labels.remove}
              </button>
            </div>
          </li>
        ))}
      </ol>
      {!values.length && <p>{labels.none}</p>}
      <div className="save-editor-toolbar">
        {choices
          .filter((c) => !values.includes(c.id))
          .map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => onChange([...values, c.id])}
            >
              {labels.add} · {c.name}
            </button>
          ))}
      </div>
    </fieldset>
  );
}
