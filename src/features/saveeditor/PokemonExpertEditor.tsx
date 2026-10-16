// SPDX-License-Identifier: GPL-3.0-or-later
import { usePokemonDraftPreparation } from "./pokemonDraftValidation";
import { rawDraftSteps } from "./pokemonDraftPlan";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PokemonSelect as Select } from "./PokemonSelect";
import { usePokemonDraftValidator } from "./pokemonDraftValidation";
import { playSaveSound } from "./saveSound";
import {
  expertDraft,
  expertMask,
  expertValues,
  identityToolsWords,
  type ExpertCatalog,
  type ExpertDraft,
  type ExpertEdit,
} from "./pokemonIdentityTools";
import type { PokemonPosition, PokemonRawEdit } from "./domain";
export function PokemonExpertEditor({
  position,
  revision,
  disabled,
  readDisabled,
  onRead,
  onApply,
}: {
  position: PokemonPosition;
  revision: number;
  disabled: boolean;
  readDisabled: boolean;
  onRead(position: PokemonPosition): Promise<ExpertCatalog | undefined>;
  onApply(edit: PokemonRawEdit): Promise<void>;
}) {
  const { i18n } = useTranslation(),
    lang = i18n.language.startsWith("zh")
      ? "zh"
      : i18n.language.startsWith("ja")
        ? "ja"
        : "en",
    w = identityToolsWords[lang];
  const [loaded, setLoaded] = useState<{
      catalog: ExpertCatalog;
      draft: ExpertDraft;
      revision: number;
    }>(),
    [pending, setPending] = useState(false),
    [error, setError] = useState(false);
  const request = useRef(0),
    currentRevision = useRef(revision),
    flight = useRef(false);
  useEffect(() => {
    currentRevision.current = revision;
    request.current++;
  }, [revision]);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const stale = loaded?.revision !== revision,
    locked = disabled || pending || stale,
    catalog = loaded?.catalog,
    draft = loaded?.draft;
  const changed = (() => {
    if (!catalog || !draft) return false;
    try {
      return expertValues(catalog, draft) !== undefined;
    } catch {
      return true;
    }
  })();
  const byteDirty = (() => {
    if (!catalog || !draft || !catalog.extraBytes.length) return false;
    try {
      return (
        expertMask(draft.byteValue, 3) !==
        catalog.extraBytes.find((b) => String(b.offset) === draft.offset)?.value
      );
    } catch {
      return true;
    }
  })();
  usePokemonDraftValidator(
    "expert",
    () => catalog && draft && expertValues(catalog, draft),
    !locked,
  );
  usePokemonDraftPreparation(
    "expert",
    () => {
      const value = catalog && draft ? expertValues(catalog, draft) : undefined;
      return rawDraftSteps(
        value ? { action: "expert", expert: value } : undefined,
      );
    },
    !locked,
  );
  async function load() {
    if (readDisabled || flight.current) return;
    flight.current = true;
    setPending(true);
    setError(false);
    const id = ++request.current,
      version = revision;
    try {
      const value = await onRead(position);
      if (
        value &&
        id === request.current &&
        version === currentRevision.current
      )
        setLoaded({
          catalog: value,
          draft: expertDraft(value),
          revision: version,
        });
    } catch {
      setError(true);
      playSaveSound("other", "exclamation");
    } finally {
      flight.current = false;
      setPending(false);
    }
  }
  async function apply(action?: ExpertEdit) {
    if (locked || flight.current || !catalog || !draft || (action && changed))
      return;
    flight.current = true;
    setPending(true);
    setError(false);
    try {
      const edit = action ?? expertValues(catalog, draft);
      if (edit) await onApply({ ...position, action: "expert", expert: edit });
      else
        setLoaded(
          (previous) =>
            previous && { ...previous, draft: expertDraft(previous.catalog) },
        );
    } catch {
      setError(true);
      playSaveSound("other", "exclamation");
    } finally {
      flight.current = false;
      setPending(false);
    }
  }
  function update(key: keyof ExpertDraft, value: string) {
    setLoaded(
      (previous) =>
        previous && { ...previous, draft: { ...previous.draft, [key]: value } },
    );
  }
  return (
    <details className="save-pokemon-editor">
      <summary>{w.title}</summary>
      <p className="save-editor-note">{w.note}</p>
      {!loaded || stale ? (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={readDisabled || pending}
            onClick={() => void load()}
          >
            {w.load}
          </button>
        </div>
      ) : (
        <>
          <fieldset className="save-editor-fields" disabled={locked}>
            <legend>{w.title}</legend>
            {catalog!.abilities.length > 0 && (
              <label className="field">
                <span>{w.ability}</span>
                <Select
                  value={draft!.ability}
                  disabled={locked}
                  onChange={(event) => update("ability", event.target.value)}
                >
                  {!catalog!.abilities.some(
                    (c) => String(c.id) === draft!.ability,
                  ) && (
                    <option value={draft!.ability} disabled data-source-invalid>
                      #{draft!.ability}
                    </option>
                  )}
                  {catalog!.abilities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name[lang]}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            {catalog!.abilityNumber !== null && (
              <label className="field">
                <span>{w.abilityNumber}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={draft!.abilityNumber}
                  onChange={(event) =>
                    update("abilityNumber", event.target.value)
                  }
                />
              </label>
            )}
            {catalog!.extraBytes.length > 0 && (
              <>
                <label className="field">
                  <span>{w.offset}</span>
                  <Select
                    value={draft!.offset}
                    disabled={locked || byteDirty}
                    onChange={(event) => {
                      const offset = event.target.value;
                      setLoaded((previous) => {
                        if (!previous) return previous;
                        const entry = previous.catalog.extraBytes.find(
                          (b) => String(b.offset) === offset,
                        );
                        return entry
                          ? {
                              ...previous,
                              draft: {
                                ...previous.draft,
                                offset,
                                byteValue: String(entry.value),
                              },
                            }
                          : previous;
                      });
                    }}
                  >
                    {catalog!.extraBytes.map((b) => (
                      <option key={b.offset} value={b.offset}>
                        0x{b.offset.toString(16).toUpperCase().padStart(2, "0")}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="field">
                  <span>{w.byteValue}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    value={draft!.byteValue}
                    onChange={(event) =>
                      update("byteValue", event.target.value)
                    }
                  />
                </label>
              </>
            )}
          </fieldset>
          {byteDirty && <p className="save-editor-note">{w.bytePending}</p>}
          <div className="save-editor-toolbar">
            {catalog!.abilityNumber !== null && (
              <button
                type="button"
                disabled={
                  locked ||
                  changed ||
                  ![1, 2, 4].includes(catalog!.abilityNumber)
                }
                onClick={() => void apply({ action: "abilityFromNumber" })}
              >
                {w.derive}
              </button>
            )}
            <button
              type="button"
              disabled={locked || !changed}
              onClick={() =>
                setLoaded(
                  (previous) =>
                    previous && {
                      ...previous,
                      draft: expertDraft(previous.catalog),
                    },
                )
              }
            >
              {w.revert}
            </button>
            <button
              type="button"
              disabled={locked || !changed}
              onClick={() => void apply()}
            >
              {w.apply}
            </button>
          </div>
        </>
      )}
      {error && (
        <p className="save-editor-error" role="alert">
          {w.error}
        </p>
      )}
    </details>
  );
}
