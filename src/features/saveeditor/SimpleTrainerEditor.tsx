// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import { saveEditorResources } from "./locales";
import { TRAINER_GAME_OPTION_KEYS } from "./domain";
import {
  simpleTrainerDraft,
  simpleTrainerWords,
  validateSimpleTrainerExtra,
  type SimpleTrainerCatalog,
  type SimpleTrainerConfirmation,
  type SimpleTrainerPreview,
  type SimpleTrainerRequest,
} from "./simpleTrainer";

interface Props {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<SimpleTrainerCatalog | undefined>;
  onPreview(
    request: SimpleTrainerRequest,
  ): Promise<SimpleTrainerPreview | undefined>;
  onApply(confirmation: SimpleTrainerConfirmation): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
  onDirtyChange?(dirty: boolean): void;
}
export function SimpleTrainerEditor(props: Props) {
  const reader = useRef(props.onRead);
  useEffect(() => {
    reader.current = props.onRead;
  }, [props.onRead]);
  const [loaded, setLoaded] = useState<{
    revision: number;
    catalog: SimpleTrainerCatalog;
  }>();
  useEffect(() => {
    let active = true;
    void reader.current().then((catalog) => {
      if (active && catalog) setLoaded({ revision: props.revision, catalog });
    });
    return () => {
      active = false;
    };
  }, [props.revision]);
  const words = simpleTrainerWords[props.lang];
  return (
    <section className="save-record-editor">
      <h3>{words.title}</h3>
      {loaded?.revision === props.revision ? (
        <Form key={props.revision} {...props} catalog={loaded.catalog} />
      ) : (
        <button
          type="button"
          disabled={props.busy}
          onClick={() =>
            void props.onRead().then((catalog) => {
              if (catalog) setLoaded({ revision: props.revision, catalog });
            })
          }
        >
          {words.read}
        </button>
      )}
    </section>
  );
}
function Form({
  catalog,
  busy,
  lang,
  onPreview,
  onApply,
  onDiscard,
  onDirtyChange,
}: Props & { catalog: SimpleTrainerCatalog }) {
  const words = simpleTrainerWords[lang],
    common = saveEditorResources[lang];
  const [draft, setDraft] = useState(() => simpleTrainerDraft(catalog.extra));
  const [preview, setPreview] = useState<SimpleTrainerPreview>();
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const original = simpleTrainerDraft(catalog.extra);
  const dirty = Object.keys(draft).some((key) => draft[key] !== original[key]);
  const disabled = busy || pending || !!preview || !catalog.canEdit;
  useEffect(() => {
    onDirtyChange?.(dirty || pending || !!preview);
  }, [dirty, pending, preview, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const ticket = useRef<SimpleTrainerPreview | undefined>(undefined);
  const mounted = useRef(true);
  const discard = useRef(onDiscard);
  useEffect(() => {
    discard.current = onDiscard;
  }, [onDiscard]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (ticket.current)
        void discard.current(ticket.current.token).catch(() => undefined);
    };
  }, []);
  const showTime =
    catalog.generation <= 2 ||
    catalog.format === "SAV3Colosseum" ||
    catalog.format === "SAV3XD";
  async function start(resave: boolean) {
    setPending(true);
    setError("");
    try {
      const request: SimpleTrainerRequest = resave
        ? { action: "resave", sourceHash: catalog.sourceHash }
        : {
            action: "patch",
            sourceHash: catalog.sourceHash,
            extra: validateSimpleTrainerExtra(
              draft,
              catalog.extra,
              catalog.maxCoins,
              catalog.generation,
            ),
          };
      const result = await onPreview(request);
      if (result) {
        if (!mounted.current) {
          await onDiscard(result.token);
          return;
        }
        ticket.current = result;
        setPreview(result);
      }
    } catch {
      if (mounted.current) setError(words.invalid);
    } finally {
      if (mounted.current) setPending(false);
    }
  }
  const badgeOrder = catalog.extra.badges
    ? Array.from({ length: catalog.extra.badges.count }, (_, index) => index)
    : [];
  if (catalog.generation === 2)
    [badgeOrder[4], badgeOrder[5]] = [badgeOrder[5], badgeOrder[4]];
  const beforeValues = simpleTrainerDraft(catalog.extra);
  const afterValues = preview ? simpleTrainerDraft(preview.result.extra) : {};
  const labels: Record<string, string> = {
    coins: words.coins,
    friendship: words.friendship,
    beachScore: words.beachScore,
    hours: common.trainerHours,
    minutes: common.trainerMinutes,
    seconds: common.trainerSeconds,
    badges: common.trainerBadges,
    ...common.trainerGameOptionNames,
  };
  return (
    <>
      {(showTime || catalog.extra.coins !== null) && (
        <fieldset className="save-editor-fields" disabled={disabled}>
          {(["coins", "friendship", "beachScore"] as const).map((key) =>
            catalog.extra[key] === null ? null : (
              <label
                className={
                  key === "coins" ? "field save-editor-amount" : "field"
                }
                key={key}
              >
                <span>{labels[key]}</span>
                <input
                  inputMode="numeric"
                  value={draft[key]}
                  maxLength={key === "friendship" ? 3 : 4}
                  onChange={(event) => {
                    setPreview(undefined);
                    setDraft({ ...draft, [key]: event.target.value });
                  }}
                />
                {key === "coins" && (
                  <button
                    type="button"
                    aria-label={words.maxCoins}
                    disabled={disabled}
                    onClick={() =>
                      setDraft({ ...draft, coins: String(catalog.maxCoins) })
                    }
                  >
                    +
                  </button>
                )}
              </label>
            ),
          )}
          {showTime &&
            (["hours", "minutes", "seconds"] as const).map((key) => (
              <label className="field" key={key}>
                <span>{labels[key]}</span>
                <input
                  inputMode="numeric"
                  value={draft[key]}
                  maxLength={key === "hours" ? 5 : 2}
                  onChange={(event) =>
                    setDraft({ ...draft, [key]: event.target.value })
                  }
                />
              </label>
            ))}
          {catalog.generation <= 2 &&
            catalog.extra.options &&
            TRAINER_GAME_OPTION_KEYS.map((key) => {
              const choices =
                key === "textSpeed"
                  ? words.gbSpeed
                  : key === "sound"
                    ? words.gbSound.slice(0, catalog.generation === 1 ? 4 : 2)
                    : common.trainerGameOptionChoices[key];
              return (
                <label className="field" key={key}>
                  <span>{labels[key]}</span>
                  <Select
                    value={draft[key]}
                    disabled={disabled}
                    onChange={(event) =>
                      setDraft({ ...draft, [key]: event.target.value })
                    }
                  >
                    {choices.map((label, index) => (
                      <option key={index} value={index}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </label>
              );
            })}
        </fieldset>
      )}
      {catalog.generation <= 2 && catalog.extra.badges && (
        <fieldset
          className="save-editor-fields save-trainer-badges"
          disabled={disabled}
        >
          <legend>{common.trainerBadges}</legend>
          {badgeOrder.map((index) => (
            <label className="save-editor-checkbox" key={index}>
              <input
                type="checkbox"
                checked={(Number(draft.badges) & (1 << index)) !== 0}
                onChange={(event) => {
                  const bits = Number(draft.badges);
                  setDraft({
                    ...draft,
                    badges: String(
                      event.target.checked
                        ? bits | (1 << index)
                        : bits & ~(1 << index),
                    ),
                  });
                }}
              />
              <span>
                {common.trainerBadge.replace("{n}", String(index + 1))}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {showTime && <p className="save-editor-note">{words.timeNote}</p>}
      <p className="save-editor-note">{words.resaveNote}</p>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={disabled || !dirty}
          onClick={() => void start(false)}
        >
          {words.preview}
        </button>
        <button
          type="button"
          disabled={disabled || dirty}
          onClick={() => void start(true)}
        >
          {words.resave}
        </button>
      </div>
      {preview && (
        <>
          <p>
            {words.changes}: {preview.changedOffsets.length}
          </p>
          <dl className="save-editor-summary">
            {preview.result.fields
              .filter(
                (field) =>
                  !Object.hasOwn(afterValues, field.key) &&
                  field.value !==
                    preview.before.fields.find((old) => old.key === field.key)
                      ?.value,
              )
              .map((field) => (
                <div key={field.key}>
                  <dt>{field.name[lang]}</dt>
                  <dd>
                    {
                      preview.before.fields.find((old) => old.key === field.key)
                        ?.value
                    }{" "}
                    → {field.value}
                  </dd>
                </div>
              ))}
            {Object.keys(afterValues)
              .filter((key) => afterValues[key] !== beforeValues[key])
              .map((key) => (
                <div key={key}>
                  <dt>{labels[key] ?? key}</dt>
                  <dd>
                    {beforeValues[key]} → {afterValues[key]}
                  </dd>
                </div>
              ))}
          </dl>
          <div className="save-editor-toolbar">
            <button
              type="button"
              className="primary"
              disabled={busy || pending}
              onClick={() => {
                setPending(true);
                void onApply({
                  token: preview.token,
                  sourceHash: preview.sourceHash,
                  targetHash: preview.targetHash,
                })
                  .then((applied) => {
                    if (applied) {
                      ticket.current = undefined;
                      setPreview(undefined);
                    }
                  })
                  .catch(() => setError(words.invalid))
                  .finally(() => setPending(false));
              }}
            >
              {words.apply}
            </button>
            <button
              type="button"
              disabled={busy || pending}
              onClick={() => {
                setPending(true);
                void onDiscard(preview.token)
                  .then(() => {
                    ticket.current = undefined;
                    setPreview(undefined);
                  })
                  .catch(() => setError(words.invalid))
                  .finally(() => setPending(false));
              }}
            >
              {words.cancel}
            </button>
          </div>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </>
  );
}
