// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePokemonDraftValidator } from "./pokemonDraftValidation";
import { playSaveSound } from "./saveSound";
import {
  dimensionsDraft,
  dimensionsValues,
  dimensionScalarDraft,
  dimensionsWords,
  sizeControlShortcut,
  type DimensionsInfo,
  type DimensionsEdit,
} from "./pokemonDimensions";
import type { PokemonPosition, PokemonRawEdit } from "./domain";
export function PokemonDimensionsEditor({
  info,
  position,
  disabled,
  onApply,
}: {
  info: DimensionsInfo;
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
    w = dimensionsWords[lang];
  const [draft, setDraft] = useState(() => dimensionsDraft(info)),
    [auto, setAuto] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(false);
  const flight = useRef(false),
    root = useRef<HTMLDetailsElement>(null),
    restoreFocus = useRef<HTMLElement | null>(null);
  const locked = disabled || pending;
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setDraft(dimensionsDraft(info));
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
  const dirty = JSON.stringify(draft) !== JSON.stringify(dimensionsDraft(info));
  usePokemonDraftValidator(
    "dimensions",
    () => dimensionsValues(info, draft, auto),
    !locked,
  );
  async function apply(action?: DimensionsEdit, enableAuto = false) {
    if (locked || flight.current || (action && dirty)) return;
    flight.current = true;
    setPending(true);
    setError(false);
    restoreFocus.current =
      document.activeElement instanceof HTMLElement &&
      root.current?.contains(document.activeElement)
        ? document.activeElement
        : null;
    try {
      const edit = action ?? dimensionsValues(info, draft, auto);
      if (edit)
        await onApply({ ...position, action: "dimensions", dimensions: edit });
      else setDraft(dimensionsDraft(info));
      if (enableAuto) setAuto(true);
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
      {info.canAuto && (
        <label className="check">
          <input
            type="checkbox"
            checked={auto}
            disabled={locked || dirty}
            onChange={(event) => {
              if (event.target.checked) void apply({ action: "reset" }, true);
              else setAuto(false);
            }}
          />
          {w.auto}
        </label>
      )}
      <fieldset className="save-editor-fields" disabled={locked}>
        <legend>{w.title}</legend>
        {(
          [
            ["heightScalar", "heightRating", "randomHeight"],
            ["weightScalar", "weightRating", "randomWeight"],
            ["scale", "scaleRating", "randomScale"],
          ] as const
        ).map(
          ([key, rating, action]) =>
            (key !== "scale" || info.scale !== null) && (
              <label className="field" key={key}>
                <span>
                  {w[key]} · {info[rating] ?? "—"}
                </span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  step={1}
                  value={draft[key]}
                  onChange={(event) =>
                    setDraft(
                      dimensionScalarDraft(
                        info,
                        draft,
                        key,
                        event.target.value,
                      ),
                    )
                  }
                  onClick={(event) => {
                    if (sizeControlShortcut(event))
                      void apply({ action, auto });
                  }}
                />
              </label>
            ),
        )}
        {(["heightAbsolute", "weightAbsolute"] as const).map(
          (key) =>
            info[key] !== null && (
              <label className="field" key={key}>
                <span>{w[key]}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  maxLength={32767}
                  value={draft[key]}
                  readOnly={auto}
                  onChange={(event) =>
                    setDraft({ ...draft, [key]: event.target.value })
                  }
                />
              </label>
            ),
        )}
        {info.cp !== null && (
          <label className="field">
            <span>{w.cp}</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={draft.cp}
              onChange={(event) =>
                setDraft({ ...draft, cp: event.target.value })
              }
            />
          </label>
        )}
      </fieldset>
      {info.linkedScale && <p className="save-editor-note">{w.linked}</p>}
      {info.canAuto && <p className="save-editor-note">{w.floatNote}</p>}
      <div className="save-editor-toolbar">
        {(["randomHeight", "randomWeight", "randomScale"] as const).map(
          (action) =>
            (action !== "randomScale" || info.scale !== null) && (
              <button
                key={action}
                type="button"
                disabled={locked || dirty}
                onClick={() => void apply({ action, auto })}
              >
                {w[action]}
              </button>
            ),
        )}
        {info.canAuto && (
          <button
            type="button"
            disabled={locked || dirty}
            onClick={() => void apply({ action: "reset" })}
          >
            {w.reset}
          </button>
        )}
        <button
          type="button"
          disabled={locked || !dirty}
          onClick={() => {
            setDraft(dimensionsDraft(info));
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
        <p className="save-editor-error" role="alert">
          {w.error}
        </p>
      )}
    </details>
  );
}
