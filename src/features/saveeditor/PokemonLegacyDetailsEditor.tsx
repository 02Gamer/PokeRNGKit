// SPDX-License-Identifier: GPL-3.0-or-later
import { usePokemonDraftPreparation } from "./pokemonDraftValidation";
import { rawDraftSteps } from "./pokemonDraftPlan";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PokemonSelect as Select } from "./PokemonSelect";
import { usePokemonDraftValidator } from "./pokemonDraftValidation";
import { playSaveSound } from "./saveSound";
import {
  legacyDraft,
  legacyValues,
  legacyWords,
  toggleLeaf,
  type LegacyInfo,
} from "./pokemonLegacyDetails";
import type { PokemonPosition, PokemonRawEdit } from "./domain";
export function PokemonLegacyDetailsEditor({
  info,
  position,
  disabled,
  onApply,
}: {
  info: LegacyInfo;
  position: PokemonPosition;
  disabled: boolean;
  onApply(edit: PokemonRawEdit): Promise<void>;
}) {
  const { i18n } = useTranslation(),
    lang = i18n.language.startsWith("zh")
      ? "zh"
      : i18n.language.startsWith("ja")
        ? "ja"
        : "en",
    w = legacyWords[lang];
  const [draft, setDraft] = useState(() => legacyDraft(info)),
    [pending, setPending] = useState(false),
    [error, setError] = useState(false);
  const flight = useRef(false),
    root = useRef<HTMLDetailsElement>(null),
    restoreFocus = useRef<HTMLElement | null>(null),
    locked = disabled || pending;
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setDraft(legacyDraft(info));
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
  const dirty = JSON.stringify(draft) !== JSON.stringify(legacyDraft(info));
  usePokemonDraftValidator(
    "legacyDetails",
    () => legacyValues(info, draft),
    !locked,
  );
  usePokemonDraftPreparation(
    "legacyDetails",
    () => {
      const value = legacyValues(info, draft);
      return rawDraftSteps(
        value ? { action: "legacyDetails", legacyDetails: value } : undefined,
      );
    },
    !locked,
  );
  async function apply() {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    setError(false);
    restoreFocus.current =
      document.activeElement instanceof HTMLElement &&
      root.current?.contains(document.activeElement)
        ? document.activeElement
        : null;
    try {
      const edit = legacyValues(info, draft);
      if (edit)
        await onApply({
          ...position,
          action: "legacyDetails",
          legacyDetails: edit,
        });
      else setDraft(legacyDraft(info));
    } catch {
      setError(true);
      playSaveSound("other", "exclamation");
    } finally {
      flight.current = false;
      setPending(false);
    }
  }
  return (
    <details className="save-pokemon-editor" ref={root}>
      <summary>{w.title}</summary>
      <p className="save-editor-note">{w.note}</p>
      <fieldset className="save-editor-fields" disabled={locked}>
        <legend>{w.title}</legend>
        {info.groundTile !== null && (
          <label className="field">
            <span>{w.groundTile}</span>
            <Select
              value={draft.groundTile}
              disabled={locked}
              onChange={(event) =>
                setDraft({ ...draft, groundTile: event.target.value })
              }
            >
              {!info.groundTiles.some(
                (c) => String(c.id) === draft.groundTile,
              ) && (
                <option disabled data-source-invalid value={draft.groundTile}>
                  #{draft.groundTile}
                </option>
              )}
              {info.groundTiles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name[lang]}
                </option>
              ))}
            </Select>
          </label>
        )}
        {info.walkingMood !== null && (
          <label className="field">
            <span>{w.walkingMood}</span>
            <input
              type="number"
              min={-127}
              max={127}
              step={1}
              value={draft.walkingMood}
              onChange={(event) =>
                setDraft({ ...draft, walkingMood: event.target.value })
              }
            />
          </label>
        )}
      </fieldset>
      {info.shinyLeaf !== null && (
        <>
          <fieldset className="save-editor-fields" disabled={locked}>
            <legend>{w.leaves}</legend>
            {Array.from({ length: 6 }, (_, index) => (
              <label className="check" key={index}>
                <input
                  type="checkbox"
                  checked={(draft.leafFlags & (1 << index)) !== 0}
                  disabled={
                    locked ||
                    (index === 5 &&
                      (draft.leafFlags & 31) !== 31 &&
                      (draft.leafFlags & 32) === 0)
                  }
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      leafFlags: toggleLeaf(
                        draft.leafFlags,
                        index,
                        event.target.checked,
                      ),
                    })
                  }
                />
                {index === 5 ? w.crown : `${w.leaf} ${index + 1}`}
              </label>
            ))}
          </fieldset>
          {(info.shinyLeaf & ~63) !== 0 && (
            <p className="save-editor-note">
              {w.raw}: {info.shinyLeaf}
            </p>
          )}
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked || draft.leafFlags === 63}
              onClick={() => setDraft({ ...draft, leafFlags: 63 })}
            >
              {w.all}
            </button>
            <button
              type="button"
              disabled={locked || draft.leafFlags === 0}
              onClick={() => setDraft({ ...draft, leafFlags: 0 })}
            >
              {w.clear}
            </button>
          </div>
        </>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={locked || !dirty}
          onClick={() => {
            setDraft(legacyDraft(info));
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
