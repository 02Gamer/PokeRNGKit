import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PokemonPosition } from "./domain";
import type { saveEditorResources } from "./locales";

export function PokemonFileTools({
  position,
  canImport,
  canExport,
  busy,
  onImport,
  onExport,
}: {
  position: PokemonPosition;
  canImport: boolean;
  canExport: boolean;
  busy: boolean;
  onImport(position: PokemonPosition, file: File): Promise<void>;
  onExport(position: PokemonPosition): Promise<void>;
}) {
  const { t } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const [file, setFile] = useState<File>();
  return (
    <details className="save-pokemon-editor">
      <summary>{words.pokemonFiles}</summary>
      <p className="save-editor-note">{words.pokemonFileNote}</p>
      <p>
        {position.box === -1 ? words.party : `${words.box} ${position.box + 1}`}{" "}
        · {words.slot} {position.slot + 1}
      </p>
      <label className="field">
        <span>{words.choosePokemonFile}</span>
        <input
          type="file"
          disabled={busy || !canImport}
          onChange={(event) => setFile(event.target.files?.[0])}
        />
      </label>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={busy || !canImport || !file}
          onClick={() => file && void onImport(position, file)}
        >
          {words.importPokemonFile}
        </button>
        <button
          type="button"
          disabled={busy || !canExport}
          onClick={() => void onExport(position)}
        >
          {words.exportPokemonFile}
        </button>
      </div>
    </details>
  );
}
