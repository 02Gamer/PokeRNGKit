// SPDX-License-Identifier: GPL-3.0-or-later
import { usePokemonDraftPreparation } from "./pokemonDraftValidation";
import { rawDraftSteps } from "./pokemonDraftPlan";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PokemonSelect as Select } from "./PokemonSelect";
import { usePokemonDraftValidator } from "./pokemonDraftValidation";
import { playSaveSound } from "./saveSound";
import {
  specialStatusDraft,
  specialStatusValues,
  specialStatusWords,
  strainDraft,
  type SpecialStatusInfo,
  type SpecialStatusEdit,
} from "./specialStatus";
import type { PokemonPosition, PokemonRawEdit } from "./domain";

export function PokemonSpecialStatusEditor({
  info,
  position,
  disabled,
  onApply,
}: {
  info: SpecialStatusInfo;
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
  const w = specialStatusWords[lang];
  const [draft, setDraft] = useState(() => specialStatusDraft(info));
  const [pending, setPending] = useState(false),
    [error, setError] = useState(false);
  const flight = useRef(false),
    root = useRef<HTMLDetailsElement>(null),
    restoreFocus = useRef<HTMLElement | null>(null);
  const locked = disabled || pending;
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setDraft(specialStatusDraft(info));
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
    JSON.stringify(draft) !== JSON.stringify(specialStatusDraft(info));
  usePokemonDraftValidator(
    "specialStatus",
    () => specialStatusValues(info, draft),
    !locked,
  );
  usePokemonDraftPreparation(
    "specialStatus",
    () => {
      const value = specialStatusValues(info, draft);
      return rawDraftSteps(
        value ? { action: "specialStatus", specialStatus: value } : undefined,
      );
    },
    !locked,
  );
  async function apply(action?: SpecialStatusEdit) {
    if (locked || flight.current || (action && dirty)) return;
    restoreFocus.current =
      document.activeElement instanceof HTMLElement &&
      root.current?.contains(document.activeElement)
        ? document.activeElement
        : null;
    flight.current = true;
    setPending(true);
    setError(false);
    try {
      const edit = action ?? specialStatusValues(info, draft);
      if (edit)
        await onApply({
          ...position,
          action: "specialStatus",
          specialStatus: edit,
        });
      else setDraft(specialStatusDraft(info));
    } catch {
      setError(true);
      playSaveSound("other", "exclamation");
    } finally {
      flight.current = false;
      setPending(false);
    }
  }
  const maximum = info.virus?.durations[Number(draft.strain)] ?? 0;
  return (
    <details className="save-pokemon-editor" ref={root}>
      <summary>{w.title}</summary>
      {info.virus && (
        <>
          <p className="save-editor-note">{w.note}</p>
          <fieldset className="save-editor-fields" disabled={locked}>
            <legend>{w.virus}</legend>
            <label className="check">
              <input
                type="checkbox"
                checked={info.virus.infected}
                disabled={locked || dirty}
                onChange={(event) =>
                  void apply({
                    action: "infected",
                    value: event.target.checked,
                  })
                }
              />
              <span>{w.infected}</span>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={info.virus.cured}
                disabled={locked || dirty}
                onChange={(event) =>
                  void apply({ action: "cured", value: event.target.checked })
                }
              />
              <span>{w.cured}</span>
            </label>
            {info.virus.infected && (
              <label className="field">
                <span>{w.strain}</span>
                <Select
                  disabled={locked}
                  value={draft.strain}
                  onChange={(event) =>
                    setDraft(strainDraft(info, draft, event.target.value))
                  }
                >
                  {!info.virus.durations.some(
                    (_, i) => String(i) === draft.strain,
                  ) && (
                    <option value={draft.strain} disabled data-source-invalid>
                      #{draft.strain}
                    </option>
                  )}
                  {info.virus.durations.map((_, strain) => (
                    <option key={strain} value={strain}>
                      {strain}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            {info.virus.infected && !info.virus.cured && (
              <label className="field">
                <span>{w.days}</span>
                <Select
                  disabled={locked}
                  value={draft.days}
                  onChange={(event) =>
                    setDraft({ ...draft, days: event.target.value })
                  }
                >
                  {(Number(draft.days) < 0 || Number(draft.days) > maximum) && (
                    <option value={draft.days} disabled data-source-invalid>
                      #{draft.days}
                    </option>
                  )}
                  {Array.from({ length: maximum + 1 }, (_, day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </Select>
              </label>
            )}
          </fieldset>
          <p className="save-editor-note">{w.stored}</p>
        </>
      )}
      {(info.nSparkle !== null || info.pokeStarFame !== null) && (
        <fieldset className="save-editor-fields" disabled={locked}>
          <legend>{w.title}</legend>
          {info.nSparkle !== null && (
            <label className="check">
              <input
                type="checkbox"
                checked={draft.nSparkle}
                onChange={(event) =>
                  setDraft({ ...draft, nSparkle: event.target.checked })
                }
              />
              <span>{w.nSparkle}</span>
            </label>
          )}
          {info.pokeStarFame !== null && (
            <label className="field">
              <span>{w.pokeStarFame}</span>
              <input
                type="number"
                min={0}
                max={255}
                step={1}
                value={draft.pokeStarFame}
                onChange={(event) =>
                  setDraft({ ...draft, pokeStarFame: event.target.value })
                }
              />
            </label>
          )}
        </fieldset>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={locked || !dirty}
          onClick={() => {
            setDraft(specialStatusDraft(info));
            setError(false);
          }}
        >
          {w.revert}
        </button>
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
