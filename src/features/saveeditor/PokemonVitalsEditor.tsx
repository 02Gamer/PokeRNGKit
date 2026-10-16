// SPDX-License-Identifier: GPL-3.0-or-later
import { usePokemonDraftPreparation } from "./pokemonDraftValidation";
import { useEffect, useRef, useState } from "react";
import { playSaveSound } from "./saveSound";
import { useTranslation } from "react-i18next";
import { PokemonSelect as Select } from "./PokemonSelect";
import { pokemonStatusImage } from "./art";
import { usePokemonDraftValidator } from "./pokemonDraftValidation";
import {
  statusChoice,
  statusIconChoice,
  vitalInteger,
  experienceInput,
  levelInput,
  vitalsWords,
  type PokemonVitalsEdit,
  type PokemonVitalsInfo,
} from "./pokemonVitals";

export function PokemonVitalsEditor({
  info,
  generation,
  disabled,
  onApply,
}: {
  info: PokemonVitalsInfo;
  generation: number;
  disabled: boolean;
  onApply(edit: PokemonVitalsEdit): Promise<void>;
}) {
  const { i18n } = useTranslation(),
    lang = i18n.language.startsWith("zh")
      ? "zh"
      : i18n.language.startsWith("ja")
        ? "ja"
        : "en",
    w = vitalsWords[lang];
  const [experience, setExperience] = useState(String(info.experience.value)),
    [level, setLevel] = useState(String(info.experience.level));
  const [type, setType] = useState(String(info.hiddenPower?.type ?? 0)),
    [status, setStatus] = useState(
      String(statusChoice(info.status.value, generation)),
    ),
    [sleep, setSleep] = useState(String(info.status.sleepTurns));
  const [preview, setPreview] = useState(info.experience.value),
    [running, setRunning] = useState(false),
    [error, setError] = useState(false);
  const locked = disabled || running,
    pending = useRef(false),
    restoreBarFocus = useRef(false),
    bar = useRef<HTMLInputElement>(null),
    modifiers = useRef({ alt: false, shift: false, control: false });
  usePokemonDraftValidator(
    "vitals",
    () => {
      experienceInput(experience);
      levelInput(level);
      if (
        info.status.show &&
        info.status.canEdit &&
        generation <= 4 &&
        Number(status) === 1
      )
        vitalInteger(sleep, 7, 1);
    },
    !locked,
  );
  usePokemonDraftPreparation(
    "vitals",
    () => {
      const edits: PokemonVitalsEdit[] = [];
      const exp = experienceInput(experience),
        lev = levelInput(level);
      if (exp !== info.experience.value)
        edits.push({ action: "experience", experience: exp });
      if (lev !== info.experience.level)
        edits.push({ action: "level", level: lev });
      if (info.hiddenPower && Number(type) !== info.hiddenPower.type) {
        if (!info.hiddenPower.types.some((c) => c.id === Number(type)))
          throw Error("Invalid hidden power draft");
        edits.push({ action: "hiddenPower", type: Number(type) });
      }
      const oldStatus = statusChoice(info.status.value, generation),
        newStatus = Number(status);
      if (
        info.status.show &&
        info.status.canEdit &&
        (newStatus !== oldStatus ||
          (generation <= 4 &&
            newStatus === 1 &&
            Number(sleep) !== info.status.sleepTurns))
      ) {
        if (!info.status.choices.some((c) => c.id === newStatus))
          throw Error("Invalid status draft");
        edits.push({
          action: "status",
          status: newStatus,
          ...(generation <= 4 && newStatus === 1
            ? { sleepTurns: vitalInteger(sleep, 7, 1) }
            : {}),
        });
      }
      return edits.length ? [{ kind: "vitals", edits }] : [];
    },
    !locked,
  );
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setExperience(String(info.experience.value));
      setLevel(String(info.experience.level));
      setType(String(info.hiddenPower?.type ?? 0));
      setStatus(String(statusChoice(info.status.value, generation)));
      setSleep(String(info.status.sleepTurns));
      setPreview(info.experience.value);
      setError(false);
    });
    return () => {
      active = false;
    };
  }, [info, generation]);
  async function apply(edit: PokemonVitalsEdit) {
    if (disabled || pending.current) return;
    restoreBarFocus.current = document.activeElement === bar.current;
    pending.current = true;
    setRunning(true);
    setError(false);
    try {
      await onApply(edit);
    } catch {
      playSaveSound("other", "exclamation");
      setError(true);
    } finally {
      pending.current = false;
      setRunning(false);
    }
  }
  useEffect(() => {
    if (locked || !restoreBarFocus.current) return;
    restoreBarFocus.current = false;
    if (
      document.activeElement === document.body ||
      document.activeElement === bar.current
    )
      bar.current?.focus({ preventScroll: true });
  }, [locked]);
  function numberEdit(kind: "experience" | "level") {
    try {
      void apply(
        kind === "experience"
          ? { action: kind, experience: experienceInput(experience) }
          : { action: kind, level: levelInput(level) },
      );
    } catch {
      playSaveSound("other", "exclamation");
      setError(true);
    }
  }
  useEffect(() => {
    const input = bar.current;
    if (!input) return;
    const wheel = (e: WheelEvent) => {
      if (disabled || pending.current || e.deltaY === 0) return;
      e.preventDefault();
      void apply({
        action: "wheel",
        width: Math.max(1, Math.round(input.getBoundingClientRect().width)),
        direction: e.deltaY < 0 ? 1 : -1,
      });
    };
    input.addEventListener("wheel", wheel, { passive: false });
    return () => input.removeEventListener("wheel", wheel);
  });
  const currentStatus = statusChoice(info.status.value, generation),
    icon = info.status.present
      ? pokemonStatusImage(
          info.status.fainted
            ? -1
            : statusIconChoice(info.status.value, generation),
        )
      : undefined;
  return (
    <details className="save-pokemon-editor">
      <summary>{w.title}</summary>
      <fieldset className="save-editor-fields" disabled={locked}>
        <legend>{w.experience}</legend>
        <label className="field">
          <span>{w.experience}</span>
          <input
            inputMode="numeric"
            maxLength={7}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
          />
        </label>
        <button type="button" onClick={() => numberEdit("experience")}>
          {w.apply}
        </button>
        <label className="field">
          <span>{w.level}</span>
          <input
            inputMode="numeric"
            maxLength={3}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          />
        </label>
        <button type="button" onClick={() => numberEdit("level")}>
          {w.apply}
        </button>
      </fieldset>
      {info.experience.showBar && (
        <>
          <label className="field">
            <span>
              {w.progress} · {Math.round(info.experience.progress * 100)}%
            </span>
            <input
              ref={bar}
              type="range"
              min={info.experience.start}
              max={info.experience.end}
              step={1}
              disabled={locked}
              value={Math.max(
                info.experience.start,
                Math.min(preview, info.experience.end),
              )}
              aria-valuetext={`${preview} / ${info.experience.end}`}
              onChange={(e) => setPreview(Number(e.target.value))}
              onPointerDown={(e) => {
                modifiers.current = {
                  alt: e.altKey,
                  shift: e.shiftKey,
                  control: e.ctrlKey,
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerCancel={() => setPreview(info.experience.value)}
              onPointerUp={(e) => {
                if (locked) return;
                if (!modifiers.current.alt && !modifiers.current.shift) {
                  if (info.experience.level < 100)
                    void apply({
                      action: "experience",
                      experience: Number(e.currentTarget.value),
                    });
                  return;
                }
                const rect = e.currentTarget.getBoundingClientRect();
                void apply({
                  action: "bar",
                  position: Math.round(e.clientX - rect.left),
                  width: Math.max(1, Math.round(rect.width)),
                  ...modifiers.current,
                });
              }}
              onKeyDown={(e) => {
                let edit: PokemonVitalsEdit | undefined;
                const width = Math.max(
                  1,
                  Math.round(e.currentTarget.getBoundingClientRect().width),
                );
                if (
                  [
                    "ArrowUp",
                    "ArrowRight",
                    "ArrowDown",
                    "ArrowLeft",
                    "Home",
                    "End",
                    "PageUp",
                    "PageDown",
                  ].includes(e.key)
                ) {
                  edit =
                    e.altKey || e.shiftKey
                      ? {
                          action: "bar",
                          position: 0,
                          width,
                          alt: e.altKey,
                          shift: e.shiftKey,
                          control: e.ctrlKey,
                        }
                      : e.key === "Home"
                        ? { action: "edgeLow" }
                        : e.key === "End"
                          ? { action: "edgeHigh" }
                          : e.key === "PageUp"
                            ? { action: "overflow" }
                            : e.key === "PageDown"
                              ? { action: "underflow" }
                              : {
                                  action: "wheel",
                                  width,
                                  direction: ["ArrowUp", "ArrowRight"].includes(
                                    e.key,
                                  )
                                    ? 1
                                    : -1,
                                };
                }
                if (edit) {
                  e.preventDefault();
                  void apply(edit);
                }
              }}
            />
          </label>
          <p className="save-editor-note">{w.barHint}</p>
          <div className="save-editor-toolbar">
            {(
              [
                "edgeLow",
                "edgeHigh",
                "overflow",
                "underflow",
                "downlevel",
              ] as const
            ).map((action) => (
              <button
                type="button"
                key={action}
                disabled={locked}
                onClick={() => void apply({ action })}
              >
                {w[action]}
              </button>
            ))}
          </div>
        </>
      )}
      {info.hiddenPower && (
        <>
          <fieldset className="save-editor-fields" disabled={locked}>
            <legend>{w.hiddenPower}</legend>
            <label className="field">
              <span>
                {w.hiddenPower}
                {info.hiddenPower.power !== null
                  ? ` · ${w.power} ${info.hiddenPower.power}`
                  : ""}
              </span>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {info.hiddenPower.types.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
            <button
              type="button"
              onClick={() =>
                void apply({ action: "hiddenPower", type: Number(type) })
              }
            >
              {w.apply}
            </button>
          </fieldset>
          <p className="save-editor-note">
            {info.hiddenPower.maximize ? w.max : w.close}
          </p>
        </>
      )}
      {info.status.show && (
        <>
          <fieldset
            className="save-editor-fields"
            disabled={locked || !info.status.canEdit}
          >
            <legend>{w.status}</legend>
            {icon && (
              <img
                src={icon}
                alt={
                  info.status.fainted
                    ? w.fainted
                    : (info.status.choices.find((c) => c.id === currentStatus)
                        ?.name[lang] ?? `#${info.status.value & 255}`)
                }
              />
            )}
            <label className="field">
              <span>{w.status}</span>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {!info.status.choices.some((c) => c.id === Number(status)) && (
                  <option value={status} disabled>
                    #{info.status.value & 255}
                  </option>
                )}
                {info.status.choices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name[lang]}
                  </option>
                ))}
              </Select>
            </label>
            {generation <= 4 && Number(status) === 1 && (
              <label className="field">
                <span>{w.sleep}</span>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={sleep}
                  onChange={(e) => setSleep(e.target.value)}
                />
              </label>
            )}
            <button
              type="button"
              disabled={
                !info.status.choices.some((c) => c.id === Number(status))
              }
              onClick={() => {
                try {
                  void apply({
                    action: "status",
                    status: Number(status),
                    ...(generation <= 4 && Number(status) === 1
                      ? { sleepTurns: vitalInteger(sleep, 7, 1) }
                      : {}),
                  });
                } catch {
                  playSaveSound("other", "exclamation");
                  setError(true);
                }
              }}
            >
              {w.apply}
            </button>
          </fieldset>
          {!info.status.canEdit ? (
            <p className="save-editor-note">{w.notStored}</p>
          ) : !info.status.present ? (
            <p className="save-editor-note">{w.noParty}</p>
          ) : null}
        </>
      )}
      {error && (
        <p role="alert" className="save-editor-error">
          {w.error}
        </p>
      )}
    </details>
  );
}
