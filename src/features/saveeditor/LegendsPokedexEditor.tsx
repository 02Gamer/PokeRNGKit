import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import { speciesImage } from "./art";
import { localizeSaveError, type saveEditorResources } from "./locales";
import { dex5Labels } from "./gen5PokedexLabels";
import { dex8Number } from "./swshPokedex";
import {
  legendsDexLabels,
  previewDex8aTasks,
  projectedDex8aPoints,
  validateDex8a,
  type Dex8aCatalog,
  type Dex8aEdit,
  type Dex8aState,
  type Dex8aFormState,
} from "./legendsPokedex";

export function LegendsPokedexEditor({
  revision,
  busy,
  onRead,
  onApply,
}: {
  revision: number;
  busy: boolean;
  onRead(): Promise<Dex8aCatalog | undefined>;
  onApply(edit: Dex8aEdit): Promise<void>;
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
    la = legendsDexLabels[lang];
  const [catalog, setCatalog] = useState<Dex8aCatalog>(),
    [species, setSpecies] = useState<number>(),
    [formId, setFormId] = useState<number>();
  const [draft, setDraft] = useState<Dex8aState>(),
    [numbers, setNumbers] = useState<Record<number, string>>({}),
    [advanced, setAdvanced] = useState<string[]>(),
    [error, setError] = useState("");
  const reader = useRef(onRead);
  useEffect(() => {
    reader.current = onRead;
  }, [onRead]);
  const reset = () => {
    setDraft(undefined);
    setNumbers({});
    setAdvanced(undefined);
    setError("");
  };
  useEffect(() => {
    let active = true;
    void reader.current().then((value) => {
      if (active) {
        setCatalog(value);
        setDraft(undefined);
        setNumbers({});
        setAdvanced(undefined);
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
  const form = state?.forms.find((f) => f.form === formId) ?? state?.forms[0],
    formInfo = entry?.forms.find((f) => f.form === form?.form);
  const entryDirty =
    (!!draft && JSON.stringify(draft) !== JSON.stringify(entry?.state)) ||
    Object.entries(numbers).some(
      ([i, v]) => v !== String(entry?.state.tasks[Number(i)]),
    );
  const advancedDirty =
      !!advanced &&
      advanced.some((v, i) => v !== String(entry?.advanced[i].value)),
    dirty = entryDirty || advancedDirty,
    disabled = busy || !catalog?.canEdit;
  const fail = (e: unknown) =>
    setError(
      localizeSaveError(e instanceof Error ? e.message : String(e), words),
    );
  const apply = async (edit: Dex8aEdit) => {
    setError("");
    try {
      await onApply(edit);
    } catch (e) {
      fail(e);
    }
  };
  const changeForm = (patch: Partial<Dex8aFormState>) => {
    if (state && form)
      setDraft({
        ...state,
        forms: state.forms.map((f) =>
          f.form === form.form ? { ...f, ...patch } : f,
        ),
      });
  };
  const taskState =
    state && entry
      ? {
          ...state,
          tasks: state.tasks.map((v, i) => {
            if (numbers[i] === undefined) return v;
            try {
              return dex8Number(numbers[i], 60000, entry.state.tasks[i]);
            } catch {
              return v;
            }
          }),
        }
      : undefined;
  const taskValues =
    taskState && entry ? previewDex8aTasks(taskState, entry) : [];
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
        entry &&
        state && (
          <>
            <label className="field">
              <span>{labels.species}</span>
              <Select
                value={entry.state.species}
                disabled={busy || dirty}
                onChange={(e) => {
                  setSpecies(Number(e.target.value));
                  setFormId(undefined);
                  reset();
                }}
              >
                {catalog.entries.map((e) => (
                  <option key={e.state.species} value={e.state.species}>
                    {e.number} · {e.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
            <div className="save-editor-toolbar">
              <img
                width={40}
                height={40}
                src={speciesImage(entry.state.species)}
                alt=""
              />
              <strong>{entry.name[lang]}</strong>
            </div>
            <fieldset disabled={disabled || advancedDirty}>
              <legend>{labels.display}</legend>
              <label className="field">
                <span>{la.displayForm}</span>
                <Select
                  value={state.displayForm}
                  onChange={(e) =>
                    setDraft({ ...state, displayForm: Number(e.target.value) })
                  }
                >
                  {!entry.forms.some((f) => f.form === state.displayForm) && (
                    <option value={state.displayForm}>
                      {labels.unknown} · {state.displayForm}
                    </option>
                  )}
                  {entry.forms.map((f) => (
                    <option key={f.form} value={f.form}>
                      {f.form} · {f.name[lang]}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="save-editor-toolbar">
                <Flag
                  disabled={!entry.canSelectGender}
                  label={la.female}
                  value={state.displayFemale}
                  onChange={(displayFemale) =>
                    setDraft({ ...state, displayFemale })
                  }
                />
                <Flag
                  label={la.shiny}
                  value={state.displayShiny}
                  onChange={(displayShiny) =>
                    setDraft({ ...state, displayShiny })
                  }
                />
                <Flag
                  label={la.alpha}
                  value={state.displayAlpha}
                  onChange={(displayAlpha) =>
                    setDraft({ ...state, displayAlpha })
                  }
                />
                <Flag
                  label={la.solitude}
                  value={state.solitude}
                  onChange={(solitude) => setDraft({ ...state, solitude })}
                />
              </div>
            </fieldset>
            {form && formInfo && (
              <fieldset disabled={disabled || advancedDirty}>
                <legend>{la.form}</legend>
                <label className="field">
                  <span>{la.form}</span>
                  <Select
                    value={form.form}
                    onChange={(e) => setFormId(Number(e.target.value))}
                  >
                    {entry.forms.map((f) => (
                      <option key={f.form} value={f.form}>
                        {f.form} · {f.name[lang]}
                      </option>
                    ))}
                  </Select>
                </label>
                {la.flagGroups.map((name, r) => (
                  <fieldset key={name}>
                    <legend>{name}</legend>
                    <div className="save-editor-toolbar">
                      {la.flags.map((label, bit) => (
                        <Flag
                          key={label}
                          label={label}
                          value={form.flags[r][bit]}
                          onChange={(value) => {
                            const flags = form.flags.map((v) => [...v]);
                            flags[r][bit] = value;
                            changeForm({ flags });
                          }}
                        />
                      ))}
                    </div>
                  </fieldset>
                ))}
                <details className="save-pokemon-editor">
                  <summary>{la.hasMax}</summary>
                  <Flag
                    label={la.hasMax}
                    value={form.hasMax}
                    onChange={(hasMax) => changeForm({ hasMax })}
                  />
                  <div className="save-editor-toolbar">
                    {la.sizes.map((name, i) => (
                      <label className="field" key={name}>
                        <span>{name}</span>
                        <input
                          value={form.sizes[i]}
                          maxLength={32767}
                          onChange={(e) => {
                            const sizes = [...form.sizes];
                            sizes[i] = e.target.value;
                            changeForm({ sizes });
                          }}
                        />
                        <small>
                          {la.theory}: {formInfo.theory[i]}
                        </small>
                      </label>
                    ))}
                  </div>
                </details>
              </fieldset>
            )}
            <h4>{la.research}</h4>
            <div className="save-editor-toolbar">
              <Flag
                disabled
                label={la.updated}
                value={entry.research.updated}
              />
              <Flag
                disabled
                label={la.complete}
                value={entry.research.complete}
              />
              <Flag
                disabled
                label={la.perfect}
                value={entry.research.perfect}
              />
            </div>
            <dl className="save-editor-summary">
              <div>
                <dt>{la.index}</dt>
                <dd>{entry.research.updateIndex}</dd>
              </div>
              <div>
                <dt>{la.reported}</dt>
                <dd>{entry.research.reported}</dd>
              </div>
              <div>
                <dt>{la.projected}</dt>
                <dd>
                  {taskState
                    ? projectedDex8aPoints(taskState, entry)
                    : entry.research.pending}
                </dd>
              </div>
            </dl>
            <fieldset disabled={disabled || advancedDirty}>
              <legend>{la.research}</legend>
              <div className="save-pokedex-table-wrap">
                <table className="save-inventory-table">
                  <thead>
                    <tr>
                      <th scope="col">{la.research}</th>
                      <th scope="col">{la.progress}</th>
                      <th scope="col">{la.thresholds}</th>
                      <th scope="col">{la.reportedSteps}</th>
                      <th scope="col">{la.points}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.tasks.map((task, i) => (
                      <tr key={i}>
                        <th scope="row">
                          {task.name[lang]}
                          {task.required && <small> · {la.required}</small>}
                        </th>
                        <td>
                          {task.editable ? (
                            <input
                              aria-label={task.name[lang]}
                              inputMode="numeric"
                              maxLength={5}
                              value={numbers[i] ?? String(state.tasks[i])}
                              onChange={(e) =>
                                setNumbers({ ...numbers, [i]: e.target.value })
                              }
                            />
                          ) : (
                            taskValues[i]
                          )}
                        </td>
                        <td>{task.thresholds.join(" / ")}</td>
                        <td>
                          {task.reported} / {task.thresholds.length}
                        </td>
                        <td>{task.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </fieldset>
            <div className="save-editor-toolbar">
              <button
                type="button"
                className="primary"
                disabled={disabled || advancedDirty || !entryDirty}
                onClick={() => {
                  try {
                    const tasks = state.tasks.map((v, i) =>
                      numbers[i] === undefined
                        ? v
                        : dex8Number(numbers[i], 60000, entry.state.tasks[i]),
                    );
                    void apply(validateDex8a({ ...state, tasks }, entry));
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
                onClick={reset}
              >
                {labels.reset}
              </button>
              <button
                type="button"
                disabled={disabled || dirty}
                onClick={() =>
                  void apply({ action: "report", species: state.species })
                }
              >
                {la.report}
              </button>
            </div>
            <details className="save-pokemon-editor">
              <summary>{la.advanced}</summary>
              <fieldset disabled={disabled || entryDirty}>
                <legend>{la.advanced}</legend>
                <div className="save-pokedex-table-wrap">
                  <table className="save-inventory-table">
                    <thead>
                      <tr>
                        <th scope="col">{la.research}</th>
                        <th scope="col">{la.progress}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.advanced.map((counter, i) => (
                        <tr key={i}>
                          <th scope="row">{counter.name[lang]}</th>
                          <td>
                            <input
                              aria-label={counter.name[lang]}
                              inputMode="numeric"
                              maxLength={5}
                              value={advanced?.[i] ?? String(counter.value)}
                              onChange={(e) => {
                                const values = advanced
                                  ? [...advanced]
                                  : entry.advanced.map((v) => String(v.value));
                                values[i] = e.target.value;
                                setAdvanced(values);
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="save-editor-toolbar">
                  <button
                    type="button"
                    disabled={!advancedDirty}
                    onClick={() => {
                      try {
                        const counters = entry.advanced.map((c, i) =>
                          dex8Number(
                            advanced?.[i] ?? String(c.value),
                            60000,
                            c.value,
                          ),
                        );
                        void apply({
                          action: "advanced",
                          species: state.species,
                          counters,
                        });
                      } catch (e) {
                        fail(e);
                      }
                    }}
                  >
                    {la.applyAdvanced}
                  </button>
                  <button
                    type="button"
                    disabled={!advancedDirty}
                    onClick={() => {
                      setAdvanced(undefined);
                      setError("");
                    }}
                  >
                    {labels.reset}
                  </button>
                </div>
              </fieldset>
            </details>
            {dirty && <p role="status">{labels.dirty}</p>}
            <p className="save-editor-note">{la.note}</p>
          </>
        )
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
  onChange,
}: {
  label: string;
  value: boolean;
  disabled?: boolean;
  onChange?(value: boolean): void;
}) {
  return (
    <label className="save-pokedex-check">
      <input
        type="checkbox"
        checked={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      {label}
    </label>
  );
}
