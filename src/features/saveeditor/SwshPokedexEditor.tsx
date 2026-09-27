import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import { speciesImage } from "./art";
import { localizeSaveError, type saveEditorResources } from "./locales";
import { dex5Labels } from "./gen5PokedexLabels";
import {
  swshDexLabels,
  dex8Shiny,
  validateDex8,
  dex8Number,
  type Dex8Catalog,
  type Dex8State,
  type Dex8Edit,
  type Dex8Action,
} from "./swshPokedex";

export function SwshPokedexEditor({
  revision,
  busy,
  onRead,
  onApply,
}: {
  revision: number;
  busy: boolean;
  onRead(): Promise<Dex8Catalog | undefined>;
  onApply(edit: Dex8Edit): Promise<void>;
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
    sw = swshDexLabels[lang];
  const [catalog, setCatalog] = useState<Dex8Catalog>();
  const [index, setIndex] = useState(1),
    [region, setRegion] = useState(1);
  const [draft, setDraft] = useState<Dex8State>();
  const [numbers, setNumbers] = useState<
    Partial<Record<"form" | "battled", string>>
  >({});
  const [action, setAction] = useState<Dex8Action>("give"),
    [shiny, setShiny] = useState(false),
    [count, setCount] = useState("500"),
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
        setNumbers({});
        setError("");
      }
    });
    return () => {
      active = false;
    };
  }, [revision]);
  const entry = catalog?.entries.find((e) => e.state.index === index),
    state = draft ?? entry?.state;
  const dirty =
      (!!draft && JSON.stringify(draft) !== JSON.stringify(entry?.state)) ||
      Object.entries(numbers).some(
        ([key, value]) =>
          value !== String(entry?.state[key as "form" | "battled"]),
      ),
    disabled = busy || !catalog?.canEdit;
  const fail = (e: unknown) =>
    setError(
      localizeSaveError(e instanceof Error ? e.message : String(e), words),
    );
  const apply = async (edit: Dex8Edit) => {
    setError("");
    try {
      await onApply(edit);
    } catch (e) {
      fail(e);
    }
  };
  const actions: [Dex8Action, string][] = [
    ["give", sw.give],
    ["complete", labels.complete],
    ["seen", labels.seenAll],
    ["clear", sw.clear],
    ["caught", labels.caught],
    ["uncaught", labels.uncaught],
    ["counts", sw.counts],
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
          <div className="save-editor-toolbar">
            <label className="field">
              <span>{words.pokedexTitle}</span>
              <Select
                value={region}
                disabled={busy || dirty}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setRegion(next);
                  setIndex(
                    catalog.entries.find((v) => v.region === next)!.state.index,
                  );
                  setDraft(undefined);
                  setNumbers({});
                  setError("");
                }}
              >
                {sw.regions.map(
                  (name, i) =>
                    catalog.entries.some((e) => e.region === i + 1) && (
                      <option key={i} value={i + 1}>
                        {name}
                      </option>
                    ),
                )}
              </Select>
            </label>
            <label className="field">
              <span>{labels.species}</span>
              <Select
                value={index}
                disabled={busy || dirty}
                onChange={(e) => {
                  setIndex(Number(e.target.value));
                  setDraft(undefined);
                  setNumbers({});
                  setError("");
                }}
              >
                {catalog.entries
                  .filter((e) => e.region === region)
                  .map((e) => (
                    <option key={e.state.index} value={e.state.index}>
                      {e.number} · {e.name[lang]}
                      {e.primary ? "" : " · " + sw.duplicate}
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
                <strong>{entry.name[lang]}</strong>
                <span>{entry.primary ? sw.primary : sw.duplicate}</span>
              </div>
              <fieldset disabled={disabled}>
                <legend>{labels.display}</legend>
                <div className="save-editor-toolbar">
                  <Flag
                    label={sw.caught}
                    value={state.caught}
                    onChange={(caught) => setDraft({ ...state, caught })}
                  />
                  <Flag
                    label={sw.gmax}
                    value={state.gigantamaxed}
                    onChange={(gigantamaxed) =>
                      setDraft({ ...state, gigantamaxed })
                    }
                  />
                  {state.gigantamaxed1 !== null && (
                    <Flag
                      label={sw.gmax1}
                      value={state.gigantamaxed1}
                      onChange={(gigantamaxed1) =>
                        setDraft({ ...state, gigantamaxed1 })
                      }
                    />
                  )}
                  <Flag
                    label={sw.displayGmax}
                    value={state.displayGigantamax}
                    onChange={(displayGigantamax) =>
                      setDraft({ ...state, displayGigantamax })
                    }
                  />
                  <Flag
                    label={sw.displayShiny}
                    value={state.displayShiny}
                    onChange={(displayShiny) =>
                      setDraft({ ...state, displayShiny })
                    }
                  />
                </div>
                <div className="save-editor-toolbar">
                  <label className="field">
                    <span>{sw.form}</span>
                    <input
                      inputMode="numeric"
                      maxLength={10}
                      value={numbers.form ?? String(state.form)}
                      onChange={(e) =>
                        setNumbers({ ...numbers, form: e.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>{sw.gender}</span>
                    <Select
                      value={state.gender}
                      onChange={(e) =>
                        setDraft({ ...state, gender: Number(e.target.value) })
                      }
                    >
                      {state.gender > 2 && (
                        <option value={state.gender}>
                          {labels.unknown} · {state.gender}
                        </option>
                      )}
                      {["♂", "♀", "—"].map((name, i) => (
                        <option key={i} value={i}>
                          {name}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="field">
                    <span>{sw.battled}</span>
                    <input
                      inputMode="numeric"
                      maxLength={10}
                      value={numbers.battled ?? String(state.battled)}
                      onChange={(e) =>
                        setNumbers({ ...numbers, battled: e.target.value })
                      }
                    />
                  </label>
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
                {labels.regions.map((name, r) => (
                  <details className="save-pokemon-editor" key={name}>
                    <summary>
                      {name} · {labels.forms} ·{" "}
                      {state.seen[r].filter(Boolean).length}/64
                    </summary>
                    <div className="save-pokedex-table-wrap">
                      <table className="save-inventory-table">
                        <thead>
                          <tr>
                            <th scope="col">{labels.forms}</th>
                            <th scope="col">{labels.seen}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.formChoices.map((form, f) => (
                            <tr key={f}>
                              <th scope="row">
                                {f} · {form[lang]}
                              </th>
                              <td>
                                <Flag
                                  label={name + " · " + f + " · " + form[lang]}
                                  hideText
                                  value={state.seen[r][f]}
                                  onChange={(value) => {
                                    const seen = state.seen.map((v) => [...v]);
                                    seen[r][f] = value;
                                    setDraft({ ...state, seen });
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))}
              </fieldset>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  className="primary"
                  disabled={disabled || !dirty}
                  onClick={() => {
                    try {
                      void apply(
                        validateDex8(
                          {
                            ...state,
                            form: dex8Number(
                              numbers.form ?? String(state.form),
                              100,
                              entry.state.form,
                            ),
                            battled: dex8Number(
                              numbers.battled ?? String(state.battled),
                              2147483647,
                              entry.state.battled,
                            ),
                          },
                          entry,
                        ),
                      );
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
                    setNumbers({});
                    setError("");
                  }}
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
                onChange={(e) => setAction(e.target.value as Dex8Action)}
              >
                {actions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            {action === "counts" && (
              <label className="field">
                <span>{sw.battled}</span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </label>
            )}
            <div className="save-editor-toolbar">
              <Flag
                disabled={!dex8Shiny(action)}
                label={labels.shiny}
                value={dex8Shiny(action) && shiny}
                onChange={setShiny}
              />
              <button
                type="button"
                onClick={() => {
                  if (
                    action === "counts" &&
                    (!/^\d{1,10}$/.test(count) || Number(count) > 2147483647)
                  ) {
                    fail(new Error("Pokedex choices are invalid."));
                    return;
                  }
                  void apply({
                    action,
                    index: action === "give" ? index : 0,
                    shiny: dex8Shiny(action) && shiny,
                    ...(action === "counts" ? { battled: Number(count) } : {}),
                  });
                }}
              >
                {labels.run}
              </button>
            </div>
          </fieldset>
          <p className="save-editor-note">{sw.note}</p>
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
