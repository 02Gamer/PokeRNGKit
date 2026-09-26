import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import type {
  OriginCatalog,
  OriginChoice,
  PokemonEntry,
  PokemonPosition,
  PokemonRawEdit,
} from "./domain";
import type { saveEditorResources } from "./locales";

export function PokemonOriginEditor({
  origin,
  position,
  disabled,
  onRead,
  onApply,
}: {
  origin: PokemonEntry["origin"];
  position: PokemonPosition;
  disabled: boolean;
  onRead(
    position: PokemonPosition,
    version?: number,
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
  const [catalog, setCatalog] = useState<OriginCatalog>();
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
  }, []);
  const load = async (version = draft.version) => {
    const id = ++request.current;
    const result = await onRead(position, version);
    if (id !== request.current || !result || result.version !== version) return;
    setCatalog(result);
    setDraft((current) => ({ ...current, version }));
  };
  const changed = (Object.keys(draft) as (keyof typeof draft)[]).some(
    (key) => draft[key] !== origin[key],
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
        disabled={disabled}
        value={draft[key]}
        onChange={(e) =>
          key === "version"
            ? void load(Number(e.target.value))
            : setDraft({ ...draft, [key]: Number(e.target.value) })
        }
      >
        {!choices.some((c) => c.id === draft[key]) && (
          <option value={draft[key]}>
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
          <button type="button" disabled={disabled} onClick={() => void load()}>
            {words.loadOriginChoices}
          </button>
        </div>
      ) : (
        <>
          <fieldset disabled={disabled} className="save-editor-fields">
            <legend>{words.originDetails}</legend>
            {field("version", words.originGame, catalog.games)}
            {field("ball", words.captureBall, catalog.balls)}
            {field("metLocation", words.metLocation, catalog.metLocations)}
            {origin.canEggLocation &&
              field("eggLocation", words.eggLocation, catalog.eggLocations)}
          </fieldset>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={disabled || !changed}
              onClick={() => void apply()}
            >
              {words.applyOriginDetails}
            </button>
          </div>
        </>
      )}
    </details>
  );
}
