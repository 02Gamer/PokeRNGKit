// SPDX-License-Identifier: GPL-3.0-or-later
import { usePokemonDraftPreparation } from "./pokemonDraftValidation";
import { rawDraftSteps } from "./pokemonDraftPlan";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PokemonSelect as Select } from "./PokemonSelect";
import { usePokemonDraftValidator } from "./pokemonDraftValidation";
import { playSaveSound } from "./saveSound";
import {
  trainerDetailsDraft,
  trainerDetailsValues,
  trainerDetailsWords,
  type TrainerDetailsCatalog,
  type TrainerDetailsDraft,
  type TrainerDetailsEdit,
} from "./trainerDetails";
import type { OriginChoice, PokemonPosition, PokemonRawEdit } from "./domain";

export function PokemonTrainerDetailsEditor({
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
  onRead(position: PokemonPosition): Promise<TrainerDetailsCatalog | undefined>;
  onApply(edit: PokemonRawEdit): Promise<void>;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const w = trainerDetailsWords[lang];
  const [loaded, setLoaded] = useState<{
    catalog: TrainerDetailsCatalog;
    draft: TrainerDetailsDraft;
    revision: number;
  }>();
  const [pending, setPending] = useState(false),
    [error, setError] = useState(false);
  const flight = useRef(false),
    request = useRef(0),
    currentRevision = useRef(revision);
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
  const stale = loaded?.revision !== revision;
  const catalog = loaded?.catalog;
  const draft = loaded?.draft;
  const locked = disabled || pending || stale;
  const dirty =
    !!catalog &&
    !!draft &&
    JSON.stringify(draft) !== JSON.stringify(trainerDetailsDraft(catalog));
  usePokemonDraftValidator(
    "trainerDetails",
    () => catalog && draft && trainerDetailsValues(catalog, draft),
    !locked,
  );
  const update = (key: keyof TrainerDetailsDraft, value: string) =>
    setLoaded(
      (previous) =>
        previous && { ...previous, draft: { ...previous.draft, [key]: value } },
    );
  usePokemonDraftPreparation(
    "trainerDetails",
    () => {
      const value =
        catalog && draft ? trainerDetailsValues(catalog, draft) : undefined;
      return rawDraftSteps(
        value ? { action: "trainerDetails", trainerDetails: value } : undefined,
      );
    },
    !locked,
  );
  async function load() {
    if (readDisabled || flight.current) return;
    const id = ++request.current,
      sourceRevision = revision;
    flight.current = true;
    setPending(true);
    setError(false);
    try {
      const value = await onRead(position);
      if (
        value &&
        id === request.current &&
        sourceRevision === currentRevision.current
      )
        setLoaded({
          catalog: value,
          draft: trainerDetailsDraft(value),
          revision: sourceRevision,
        });
    } catch {
      setError(true);
      playSaveSound("other", "exclamation");
    } finally {
      flight.current = false;
      setPending(false);
    }
  }
  async function apply(action?: TrainerDetailsEdit) {
    if (locked || flight.current || !catalog || !draft || (action && dirty))
      return;
    flight.current = true;
    setPending(true);
    setError(false);
    try {
      const edit = action ?? trainerDetailsValues(catalog, draft);
      if (edit)
        await onApply({
          ...position,
          action: "trainerDetails",
          trainerDetails: edit,
        });
    } catch {
      setError(true);
      playSaveSound("other", "exclamation");
    } finally {
      flight.current = false;
      setPending(false);
    }
  }
  const select = (
    key: keyof TrainerDetailsDraft,
    choices: OriginChoice[],
    label: string,
  ) =>
    !draft ? null : (
      <label className="field">
        <span>{label}</span>
        <Select
          value={draft[key]}
          disabled={
            locked || (key === "handlingGender" && !draft.handlingName.trim())
          }
          onChange={(event) => update(key, event.target.value)}
        >
          {!choices.some((c) => String(c.id) === draft[key]) && (
            <option value={draft[key]} disabled data-source-invalid>
              #{draft[key]}
            </option>
          )}
          {choices.map((c) => (
            <option
              key={c.id}
              value={c.id}
              disabled={
                key === "handler" && c.id === 1 && !draft.handlingName.trim()
              }
            >
              {c.name[lang] || "—"}
            </option>
          ))}
        </Select>
      </label>
    );
  const pair = (labels: string[]): OriginChoice[] =>
    labels.map((label, id) => ({
      id,
      name: { zh: label, en: label, ja: label },
    }));
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
            {select("language", catalog!.languages, w.language)}
            {select(
              "originalGender",
              pair([w.male, w.female]),
              w.originalGender,
            )}
            {catalog!.handlingName !== null && (
              <>
                <label className="field">
                  <span>{w.handlingName}</span>
                  <input
                    value={draft!.handlingName}
                    maxLength={catalog!.maxNameLength}
                    onChange={(event) => {
                      const name = event.target.value;
                      setLoaded((previous) => {
                        if (!previous) return previous;
                        return {
                          ...previous,
                          draft: {
                            ...previous.draft,
                            handlingName: name,
                            ...(!name.trim()
                              ? { handler: "0", handlingGender: "0" }
                              : {}),
                          },
                        };
                      });
                    }}
                  />
                </label>
                {select(
                  "handlingGender",
                  pair([w.male, w.female]),
                  w.handlingGender,
                )}
                {select("handler", pair([w.original, w.handling]), w.handler)}
              </>
            )}
            {catalog!.handlingLanguage !== null &&
              select(
                "handlingLanguage",
                catalog!.handlingLanguages,
                w.handlingLanguage,
              )}
            {catalog!.originRegion && (
              <>
                <label className="field">
                  <span>{w.country}</span>
                  <Select
                    disabled={locked}
                    value={draft!.country}
                    onChange={(event) => {
                      const country = event.target.value;
                      setLoaded((previous) => {
                        if (!previous) return previous;
                        const region =
                          catalog!.originRegion!.regions.find(
                            (r) => r.country === Number(country),
                          )?.choices[0]?.id ?? 0;
                        return {
                          ...previous,
                          draft: {
                            ...previous.draft,
                            country,
                            region: String(region),
                          },
                        };
                      });
                    }}
                  >
                    {!catalog!.originRegion.countries.some(
                      (c) => String(c.id) === draft!.country,
                    ) && (
                      <option
                        value={draft!.country}
                        disabled
                        data-source-invalid
                      >
                        #{draft!.country}
                      </option>
                    )}
                    {catalog!.originRegion.countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name[lang]}
                      </option>
                    ))}
                  </Select>
                </label>
                {select(
                  "region",
                  catalog!.originRegion.regions.find(
                    (r) => r.country === Number(draft!.country),
                  )?.choices ?? [],
                  w.region,
                )}
                {select(
                  "consoleRegion",
                  catalog!.originRegion.consoles,
                  w.consoleRegion,
                )}
              </>
            )}
            {catalog!.battleVersion !== null &&
              select("battleVersion", catalog!.battleVersions, w.battleVersion)}
            {catalog!.obedienceLevel !== null && (
              <label className="field">
                <span>{w.obedienceLevel}</span>
                <input
                  value={draft!.obedienceLevel}
                  inputMode="numeric"
                  maxLength={3}
                  onChange={(event) =>
                    update("obedienceLevel", event.target.value)
                  }
                />
              </label>
            )}
          </fieldset>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked || !dirty}
              onClick={() =>
                setLoaded(
                  (previous) =>
                    previous && {
                      ...previous,
                      draft: trainerDetailsDraft(previous.catalog),
                    },
                )
              }
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
            {catalog!.obedienceLevel !== null && (
              <button
                type="button"
                disabled={
                  locked ||
                  dirty ||
                  catalog!.obedienceLevel === catalog!.suggestedObedienceLevel
                }
                onClick={() => void apply({ action: "suggestObedience" })}
              >
                {w.suggested}
              </button>
            )}
          </div>
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
