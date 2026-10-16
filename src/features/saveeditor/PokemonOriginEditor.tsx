import { usePokemonDraftPreparation } from "./pokemonDraftValidation";
import { rawDraftSteps } from "./pokemonDraftPlan";
import { useEffect, useRef, useState } from "react";
import { usePokemonDraftValidator } from "./pokemonDraftValidation";
import { useTranslation } from "react-i18next";
import { PokemonSelect as Select } from "./PokemonSelect";
import type {
  OriginCatalog,
  OriginChoice,
  PokemonEntry,
  PokemonPosition,
  PokemonRawEdit,
} from "./domain";
import type { saveEditorResources } from "./locales";
import { PokemonBallBrowser } from "./PokemonBallBrowser";
import { ballBrowserWords, originPreviewBall } from "./ballBrowser";
import { useSaveSettingsRevision } from "./useSaveSettingsJson";

export function PokemonOriginEditor({
  origin,
  position,
  disabled,
  readDisabled,
  onRead,
  onApply,
}: {
  origin: PokemonEntry["origin"];
  position: PokemonPosition;
  disabled: boolean;
  readDisabled: boolean;
  onRead(
    position: PokemonPosition,
    version?: number,
    ball?: number,
  ): Promise<OriginCatalog | undefined>;
  onApply(edit: PokemonRawEdit): Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const language = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const settingsRevision = useSaveSettingsRevision();
  const [loaded, setLoaded] = useState<{
    catalog: OriginCatalog;
    settingsRevision: string;
  }>();
  const catalog =
    loaded?.settingsRevision === settingsRevision ? loaded.catalog : undefined;
  const [loadingRevision, setLoadingRevision] = useState<string>();
  const pending = loadingRevision === settingsRevision;
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    version: origin.version,
    ball: origin.ball,
    metLocation: origin.metLocation,
    eggLocation: origin.eggLocation,
  });
  const request = useRef(0);
  useEffect(() => {
    const lifecycle = request;
    return () => {
      lifecycle.current++;
    };
  }, [settingsRevision]);
  const load = async (version = draft.version, ball = draft.ball) => {
    const id = ++request.current;
    setLoadingRevision(settingsRevision);
    setError("");
    try {
      const result = await onRead(position, version, ball);
      if (id !== request.current) return;
      if (!result || result.version !== version)
        throw new Error("Missing origin catalog.");
      setLoaded({ catalog: result, settingsRevision });
      setDraft((current) => ({
        ...current,
        version,
        ball: originPreviewBall(
          current,
          { version, ball },
          result.ballBrowser.currentBall,
        ),
      }));
    } catch {
      if (id === request.current) setError(ballBrowserWords[language].error);
    } finally {
      if (id === request.current) setLoadingRevision(undefined);
    }
  };
  const changed = (Object.keys(draft) as (keyof typeof draft)[]).some(
    (key) => draft[key] !== origin[key],
  );
  usePokemonDraftValidator(
    "origin",
    () => {
      if (!catalog || pending) throw Error("Origin catalog is not ready");
      const fields = [
        [draft.version, catalog.games],
        [draft.ball, catalog.balls],
        [draft.metLocation, catalog.metLocations],
        ...(origin.canEggLocation
          ? [[draft.eggLocation, catalog.eggLocations] as const]
          : []),
      ] as const;
      if (
        fields.some(([value, choices]) => !choices.some((c) => c.id === value))
      )
        throw Error("Invalid origin selection");
    },
    !disabled && (loaded !== undefined || pending),
  );
  usePokemonDraftPreparation(
    "origin",
    () => {
      const edit: NonNullable<PokemonRawEdit["origin"]> = {};
      for (const key of Object.keys(draft) as (keyof typeof draft)[])
        if (draft[key] !== origin[key]) edit[key] = draft[key];
      return rawDraftSteps(
        Object.keys(edit).length
          ? { action: "origin", origin: edit }
          : undefined,
      );
    },
    !disabled && (loaded !== undefined || pending),
  );
  const apply = async () => {
    const edit: NonNullable<PokemonRawEdit["origin"]> = {};
    for (const key of Object.keys(draft) as (keyof typeof draft)[])
      if (draft[key] !== origin[key]) edit[key] = draft[key];
    if (Object.keys(edit).length)
      await onApply({ ...position, action: "origin", origin: edit });
  };
  const field = (
    key: keyof typeof draft,
    label: string,
    choices: OriginChoice[],
  ) => (
    <label className="field">
      <span>{label}</span>
      <Select
        disabled={disabled || pending}
        value={draft[key]}
        onChange={(e) =>
          key === "version"
            ? void load(Number(e.target.value))
            : key === "ball"
              ? void load(draft.version, Number(e.target.value))
              : setDraft({ ...draft, [key]: Number(e.target.value) })
        }
      >
        {!choices.some((c) => c.id === draft[key]) && (
          <option value={draft[key]} disabled data-source-invalid>
            #{draft[key]} · {words.originUnlisted}
          </option>
        )}
        {choices.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.name[language]}
          </option>
        ))}
      </Select>
    </label>
  );
  return (
    <details className="save-pokemon-editor">
      <summary>{words.originDetails}</summary>
      <p className="save-editor-note">{words.originDetailsNote}</p>
      {!catalog ? (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={readDisabled || pending}
            onClick={() => void load()}
          >
            {words.loadOriginChoices}
          </button>
        </div>
      ) : (
        <>
          <fieldset
            disabled={disabled || pending}
            className="save-editor-fields"
          >
            <legend>{words.originDetails}</legend>
            {field("version", words.originGame, catalog.games)}
            {field("ball", words.captureBall, catalog.balls)}
            {field("metLocation", words.metLocation, catalog.metLocations)}
            {origin.canEggLocation &&
              field("eggLocation", words.eggLocation, catalog.eggLocations)}
          </fieldset>
          <PokemonBallBrowser
            catalog={catalog.ballBrowser}
            value={draft.ball}
            lang={language}
            disabled={disabled || readDisabled || pending}
            onChoose={(ball) => {
              if (ball !== draft.ball) void load(draft.version, ball);
            }}
          />
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={disabled || pending || !changed}
              onClick={() => void apply()}
            >
              {words.applyOriginDetails}
            </button>
          </div>
        </>
      )}
      {pending && <p role="status">{ballBrowserWords[language].loading}</p>}
      {error && (
        <p role="alert" className="save-editor-error">
          {error}
        </p>
      )}
    </details>
  );
}
