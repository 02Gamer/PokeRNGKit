import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import { PokemonEggEditor } from "./PokemonEggEditor";
import { saveEditorResources } from "./locales";
import { standaloneWords } from "./standaloneWords";
import type { PokemonEntry, PokemonRawEdit } from "./domain";
import type {
  StandaloneEggCatalog,
  StandaloneEggTrainer,
} from "./standalonePokemon";

export function StandaloneEggEditor({
  pokemon,
  disabled,
  onRead,
  onApply,
  initialTrainer,
}: {
  pokemon: PokemonEntry;
  disabled: boolean;
  onRead(): Promise<StandaloneEggCatalog | undefined>;
  onApply(edit: PokemonRawEdit, trainer: StandaloneEggTrainer): Promise<void>;
  initialTrainer?: StandaloneEggTrainer;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const words = standaloneWords[lang],
    common = saveEditorResources[lang];
  const [catalog, setCatalog] = useState<StandaloneEggCatalog>();
  const [draft, setDraft] = useState({
    version: 0,
    name: "",
    tid: "",
    sid: "",
  });
  const [error, setError] = useState(false);
  const request = useRef(0);
  useEffect(() => {
    const lifecycle = request;
    return () => {
      lifecycle.current++;
    };
  }, []);
  const load = async () => {
    const id = ++request.current;
    const result = await onRead();
    if (!result || id !== request.current) return;
    setCatalog(result);
    const trainer = initialTrainer ?? result.trainer;
    setDraft({
      ...trainer,
      tid: String(trainer.tid),
      sid: String(trainer.sid),
    });
    setError(false);
  };
  const apply = async (edit: PokemonRawEdit) => {
    const invalid =
      !catalog ||
      !catalog.games.some((game) => game.id === draft.version) ||
      !draft.name ||
      draft.name.length > catalog.maximumName ||
      /\p{Cc}/u.test(draft.name) ||
      ![draft.tid, draft.sid].every(
        (value) => /^\d{1,5}$/.test(value) && Number(value) <= 65535,
      );
    setError(invalid);
    if (invalid) return;
    await onApply(edit, {
      ...draft,
      tid: Number(draft.tid),
      sid: Number(draft.sid),
    });
  };
  return (
    <PokemonEggEditor
      egg={pokemon.eggInfo}
      position={pokemon}
      disabled={disabled || !catalog}
      onApply={apply}
    >
      <p className="save-editor-note">{words.eggContextNote}</p>
      {!catalog ? (
        <div className="save-editor-toolbar">
          <button type="button" disabled={disabled} onClick={() => void load()}>
            {words.loadEggContext}
          </button>
        </div>
      ) : (
        <fieldset className="save-editor-fields" disabled={disabled}>
          <legend>{words.eggContext}</legend>
          <label className="field">
            <span>{words.targetGame}</span>
            <Select
              disabled={disabled}
              value={draft.version}
              onChange={(event) =>
                setDraft({ ...draft, version: Number(event.target.value) })
              }
            >
              {catalog.games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name[lang]}
                </option>
              ))}
            </Select>
          </label>
          <label className="field">
            <span>{words.contextTrainer}</span>
            <input
              value={draft.name}
              maxLength={catalog.maximumName}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </label>
          {(["tid", "sid"] as const).map((key) => (
            <label className="field" key={key}>
              <span>{common[key]}</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={draft[key]}
                onChange={(event) =>
                  setDraft({ ...draft, [key]: event.target.value })
                }
              />
            </label>
          ))}
        </fieldset>
      )}
      {error && (
        <p className="save-editor-error" role="alert">
          {common.pokemonValueError}
        </p>
      )}
    </PokemonEggEditor>
  );
}
