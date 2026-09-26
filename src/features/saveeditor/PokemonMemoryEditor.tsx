import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import type {
  MemoryCatalog,
  MemoryEdit,
  MemoryQuery,
  OriginChoice,
  PokemonPosition,
  PokemonRawEdit,
} from "./domain";
import type { saveEditorResources } from "./locales";

export function PokemonMemoryEditor({
  position,
  disabled,
  onRead,
  onApply,
}: {
  position: PokemonPosition;
  disabled: boolean;
  onRead(query: MemoryQuery): Promise<MemoryCatalog | undefined>;
  onApply(edit: PokemonRawEdit): Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const [catalog, setCatalog] = useState<MemoryCatalog>();
  const [draft, setDraft] = useState<MemoryEdit>();
  const [original, setOriginal] = useState<MemoryEdit>();
  const request = useRef(0);
  useEffect(() => {
    const lifecycle = request;
    return () => {
      lifecycle.current++;
    };
  }, []);
  const load = async (handler: 0 | 1, memory?: number) => {
    const id = ++request.current;
    const result = await onRead({ ...position, handler, memory });
    if (id !== request.current || !result) return;
    setCatalog(result);
    if (memory === undefined) {
      setOriginal(result.current);
      setDraft(result.current);
    } else
      setDraft((previous) => ({
        ...result.current,
        variable: result.variables[0]?.id ?? 0,
        intensity: memory === 0 ? 0 : (previous?.intensity ?? 0),
        feeling: memory === 0 ? 0 : (previous?.feeling ?? 0),
      }));
  };
  const changed = JSON.stringify(draft) !== JSON.stringify(original);
  const name = (choices: OriginChoice[], id: number) =>
    choices.find((c) => c.id === id)?.name[lang] ?? `#${id}`;
  const renderMemory = (template: string) => {
    if (!catalog || !draft) return template;
    const args = [
      catalog.nickname,
      catalog.trainer,
      name(catalog.variables, draft.variable),
      name(catalog.feelings, draft.feeling),
      name(catalog.intensities, draft.intensity),
    ];
    return template.replace(/\{([0-4])\}/g, (_, n: string) => args[Number(n)]);
  };
  const field = (
    key: "variable" | "intensity" | "feeling",
    label: string,
    choices: OriginChoice[],
  ) =>
    draft && (
      <label className="field">
        <span>{label}</span>
        <Select
          disabled={disabled || !catalog?.canEdit}
          value={draft[key]}
          onChange={(e) =>
            setDraft({ ...draft, [key]: Number(e.target.value) })
          }
        >
          {!choices.some((c) => c.id === draft[key]) && (
            <option value={draft[key]}>#{draft[key]}</option>
          )}
          {choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name[lang]}
            </option>
          ))}
        </Select>
      </label>
    );
  return (
    <details className="save-pokemon-editor">
      <summary>{words.memoryTitle}</summary>
      <p className="save-editor-note">{words.memoryNote}</p>
      {!catalog || !draft ? (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={disabled}
            onClick={() => void load(0)}
          >
            {words.loadMemory}
          </button>
        </div>
      ) : (
        <>
          <fieldset disabled={disabled} className="save-editor-fields">
            <legend>{words.memoryTitle}</legend>
            <label className="field">
              <span>{words.memoryTrainer}</span>
              <Select
                disabled={disabled || changed}
                value={draft.handler}
                onChange={(e) => void load(Number(e.target.value) as 0 | 1)}
              >
                <option value={0}>{words.originalTrainer}</option>
                <option value={1}>{words.handlingTrainer}</option>
              </Select>
            </label>
            <label className="field">
              <span>{words.memoryEvent}</span>
              <Select
                disabled={disabled || !catalog.canEdit}
                value={draft.memory}
                onChange={(e) =>
                  void load(draft.handler, Number(e.target.value))
                }
              >
                {!catalog.memories.some((c) => c.id === draft.memory) && (
                  <option value={draft.memory}>#{draft.memory}</option>
                )}
                {catalog.memories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {renderMemory(c.name[lang])}
                  </option>
                ))}
              </Select>
            </label>
            {catalog.variables.length > 1 &&
              field("variable", words.memoryArgument, catalog.variables)}
            {draft.memory !== 0 &&
              field("intensity", words.memoryIntensity, catalog.intensities)}
            {draft.memory !== 0 &&
              field("feeling", words.memoryFeeling, catalog.feelings)}
          </fieldset>
          {!catalog.canEdit && (
            <p className="save-editor-note">{words.memoryUnavailable}</p>
          )}
          <p className="save-editor-note">
            {renderMemory(name(catalog.memories, draft.memory))}
          </p>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={disabled || !catalog.canEdit}
              onClick={() => void load(draft.handler, 0)}
            >
              {words.clearMemory}
            </button>
            <button
              type="button"
              disabled={disabled || !changed}
              onClick={() => void load(draft.handler)}
            >
              {words.revertMemory}
            </button>
            <button
              type="button"
              disabled={disabled || !catalog.canEdit || !changed}
              onClick={() =>
                void onApply({ ...position, action: "memory", memory: draft })
              }
            >
              {words.applyMemory}
            </button>
          </div>
        </>
      )}
    </details>
  );
}
