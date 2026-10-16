// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PokemonSelect as Select } from "./PokemonSelect";
import { usePokemonDraftValidator } from "./pokemonDraftValidation";
import { playSaveSound } from "./saveSound";
import {
  advancedStatsDraft,
  advancedStatsValues,
  advancedStatsWords,
  awakeningShortcut,
  boostInput,
  validateAdvancedStatsDraft,
  type AdvancedStatsEdit,
  type AdvancedStatsInfo,
} from "./advancedStats";
import type { PokemonPosition, PokemonRawEdit } from "./domain";
import { saveEditorResources } from "./locales";

export function PokemonAdvancedStatsEditor({
  info,
  position,
  disabled,
  onApply,
}: {
  info: AdvancedStatsInfo;
  position: PokemonPosition;
  disabled: boolean;
  onApply(edit: PokemonRawEdit): Promise<void>;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const w = advancedStatsWords[lang],
    common = saveEditorResources[lang];
  const names = [
    common.hp,
    common.attack,
    common.defense,
    common.spAttack,
    common.spDefense,
    common.speed,
  ];
  const [draft, setDraft] = useState(() => advancedStatsDraft(info));
  const [error, setError] = useState(false),
    [pending, setPending] = useState(false);
  const flight = useRef(false);
  const root = useRef<HTMLDetailsElement>(null),
    restoreFocus = useRef<HTMLElement | null>(null);
  const locked = disabled || pending;
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setDraft(advancedStatsDraft(info));
        setError(false);
      }
    });
    return () => {
      active = false;
    };
  }, [info]);
  useEffect(() => {
    if (locked || !restoreFocus.current) return;
    const target = restoreFocus.current;
    restoreFocus.current = null;
    if (
      document.activeElement === document.body &&
      root.current?.contains(target)
    )
      target.focus({ preventScroll: true });
  }, [locked]);
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(advancedStatsDraft(info));
  usePokemonDraftValidator(
    "advancedStats",
    () => validateAdvancedStatsDraft(info, draft),
    !locked,
  );
  async function apply(edit?: AdvancedStatsEdit) {
    if (locked || flight.current || (edit && dirty)) return;
    restoreFocus.current =
      document.activeElement instanceof HTMLElement &&
      root.current?.contains(document.activeElement)
        ? document.activeElement
        : null;
    flight.current = true;
    setPending(true);
    setError(false);
    try {
      const request = edit ?? advancedStatsValues(info, draft);
      if (request)
        await onApply({
          ...position,
          action: "advancedStats",
          advancedStats: request,
        });
      else setDraft(advancedStatsDraft(info));
    } catch {
      playSaveSound("other", "exclamation");
      setError(true);
    } finally {
      flight.current = false;
      setPending(false);
    }
  }
  const action = (kind: AdvancedStatsEdit["action"], label: string) => (
    <button
      type="button"
      disabled={locked || dirty}
      onClick={(event) =>
        void apply({
          action: kind === "avRandom" ? awakeningShortcut(event) : kind,
        })
      }
    >
      {label}
    </button>
  );
  return (
    <details ref={root} className="save-pokemon-editor">
      <summary>{w.title}</summary>
      <p className="save-editor-note">{w.hint}</p>
      {(["awakening", "ganbaru"] as const).map((key) => {
        const stats = info[key];
        if (!stats) return null;
        const av = key === "awakening";
        return (
          <div key={key}>
            <fieldset disabled={locked} className="save-editor-fields">
              <legend>{w[key]}</legend>
              {draft[key].map((value, index) => (
                <label className="field" key={index}>
                  <span>{names[index]}</span>
                  <input
                    inputMode="numeric"
                    maxLength={3}
                    title={`0–${stats.maximum}`}
                    value={value}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [key]: draft[key].map((v, i) =>
                          i === index ? e.target.value : v,
                        ),
                      })
                    }
                    onBlur={() => {
                      if (value === String(stats.values[index])) return;
                      try {
                        const next = String(boostInput(value, stats.maximum));
                        setDraft((d) => ({
                          ...d,
                          [key]: d[key].map((v, i) => (i === index ? next : v)),
                        }));
                      } catch {
                        setError(true);
                      }
                    }}
                    onClick={(e) => {
                      if (!locked && !dirty && (e.ctrlKey || e.altKey)) {
                        e.preventDefault();
                        void apply({
                          action: av
                            ? e.ctrlKey
                              ? "avToggle"
                              : "avZero"
                            : e.ctrlKey
                              ? "gvToggle"
                              : "gvZero",
                          index,
                        });
                      }
                    }}
                  />
                  {stats.legalMaximum && (
                    <span
                      className={`save-editor-note${Number(value) > stats.legalMaximum[index] ? " save-editor-error" : ""}`}
                    >
                      {w.legalMax}: {stats.legalMaximum[index]}
                      {Number(value) > stats.legalMaximum[index]
                        ? ` · ${w.over}`
                        : ""}
                    </span>
                  )}
                </label>
              ))}
            </fieldset>
            <div className="save-editor-toolbar">
              {action(av ? "avMax" : "gvMax", w.max)}
              {action(av ? "avClear" : "gvClear", w.clear)}
              {action(av ? "avSuggested" : "gvSuggested", w.suggested)}
              {av && (
                <>
                  {action("avMinimum", w.minimum)}
                  {action("avRandom", w.random)}
                </>
              )}
            </div>
          </div>
        );
      })}
      {(info.dynamaxLevel != null ||
        info.gigantamax != null ||
        info.alpha != null ||
        info.noble != null) && (
        <fieldset disabled={locked} className="save-editor-fields">
          <legend>{w.title}</legend>
          {info.dynamaxLevel != null && (
            <label className="field">
              <span>{w.dynamax}</span>
              <Select
                disabled={locked}
                value={draft.dynamaxLevel}
                onChange={(e) =>
                  setDraft({ ...draft, dynamaxLevel: e.target.value })
                }
              >
                {info.dynamaxLevel > 10 && (
                  <option
                    value={String(info.dynamaxLevel)}
                    disabled
                    data-source-invalid
                  >
                    #{info.dynamaxLevel}
                  </option>
                )}
                {Array.from({ length: 11 }, (_, i) => (
                  <option value={i} key={i}>
                    {i}
                  </option>
                ))}
              </Select>
            </label>
          )}
          {(["gigantamax", "alpha", "noble"] as const).map(
            (key) =>
              info[key] != null && (
                <label className="check" key={key}>
                  <input
                    type="checkbox"
                    checked={draft[key]}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.checked })
                    }
                  />
                  {w[key]}
                </label>
              ),
          )}
        </fieldset>
      )}
      {info.dynamaxLevel != null && (
        <div className="save-editor-toolbar">
          {action("dynamaxToggle", w.toggle)}
        </div>
      )}
      {info.tera && (
        <>
          <fieldset disabled={locked} className="save-editor-fields">
            <legend>
              {w.original} / {w.override}
            </legend>
            {(["teraOriginal", "teraOverride"] as const).map((key) => (
              <label className="field" key={key}>
                <span>{key === "teraOriginal" ? w.original : w.override}</span>
                <Select
                  disabled={locked}
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                >
                  {!info.tera!.choices.some(
                    (c) => String(c.id) === draft[key],
                  ) && (
                    <option value={draft[key]} disabled data-source-invalid>
                      #{draft[key]}
                    </option>
                  )}
                  {info.tera!.choices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name[lang]}
                    </option>
                  ))}
                </Select>
              </label>
            ))}
          </fieldset>
          <div className="save-editor-toolbar">
            {action("teraPrimary", w.primary)}
            {action("teraSecondary", w.secondary)}
            {action("teraToggle", w.teraToggle)}
            {action("teraReset", w.reset)}
          </div>
        </>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={locked || !dirty}
          onClick={() => void apply()}
        >
          {w.apply}
        </button>
      </div>
      {error && (
        <p role="alert" className="save-editor-error">
          {w.error}
        </p>
      )}
    </details>
  );
}

export function PokemonBoostRows({
  info,
  lang,
}: {
  info?: AdvancedStatsInfo | null;
  lang: "zh" | "en" | "ja";
}) {
  if (!info) return null;
  return (
    <>
      {(["awakening", "ganbaru"] as const).map((key) => {
        const stats = info[key];
        return (
          stats && (
            <tr key={key}>
              <th scope="row">{advancedStatsWords[lang][key]}</th>
              {stats.values.map((value, index) => (
                <td key={index}>{value}</td>
              ))}
            </tr>
          )
        );
      })}
    </>
  );
}
