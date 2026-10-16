import { useState } from "react";
import { slotCanWrite } from "./slotAccess";
import { storageActionAllowed } from "./storageAccess";
import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import type { PokemonEntry, SaveReport, StorageEdit } from "./domain";
import type { saveEditorResources } from "./locales";
import { boxGalleryWords } from "./boxGalleryWords";

export function StorageEditor({
  report,
  source,
  busy,
  onApply,
}: {
  report: SaveReport;
  source: PokemonEntry;
  busy: boolean;
  onApply(edit: StorageEdit): Promise<void>;
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
  const [box, setBox] = useState(source.box);
  const [slot, setSlot] = useState(source.slot);
  const allowed = (action: StorageEdit["action"]) =>
    !busy && storageActionAllowed(report, source, { box, slot }, action);
  const perform = (action: StorageEdit["action"]) =>
    allowed(action)
      ? onApply({
          action,
          source: { box: source.box, slot: source.slot },
          target: action === "delete" ? null : { box, slot },
        })
      : Promise.resolve();
  return (
    <details className="save-pokemon-editor">
      <summary>{words.storageSettings}</summary>
      <div className="save-editor-fields">
        <label className="field">
          <span>{words.targetBox}</span>
          <Select
            value={box}
            disabled={busy}
            onChange={(event) => {
              setBox(Number(event.target.value));
              setSlot(0);
            }}
          >
            {report.slotAccess?.hasParty && (
              <option value={-1}>{words.party}</option>
            )}
            {report.boxes.map((entry) => (
              <option key={entry.index} value={entry.index}>
                {entry.name || `${words.box} ${entry.index + 1}`}
              </option>
            ))}
          </Select>
        </label>
        <label className="field">
          <span>{words.targetSlot}</span>
          <Select
            value={slot}
            disabled={busy}
            onChange={(event) => setSlot(Number(event.target.value))}
          >
            {Array.from(
              {
                length:
                  box === -1
                    ? Math.min(6, report.partyCount + 1)
                    : report.boxSlotCount,
              },
              (_, index) => {
                const pokemon = report.pokemon.find(
                  (p) => p.box === box && p.slot === index,
                );
                return (
                  <option
                    key={index}
                    value={index}
                    disabled={!slotCanWrite(report, { box, slot: index })}
                  >
                    {index + 1} ·{" "}
                    {pokemon ? pokemon.speciesName[lang] : words.empty}
                  </option>
                );
              },
            )}
          </Select>
        </label>
      </div>
      <p className="save-editor-note">{words.storageNote}</p>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={!allowed("move")}
          onClick={() => void perform("move")}
        >
          {words.movePokemon}
        </button>
        <button
          type="button"
          disabled={!allowed("swap")}
          onClick={() => void perform("swap")}
        >
          {words.swapPokemon}
        </button>
        <button
          type="button"
          disabled={!allowed("copy")}
          onClick={() => void perform("copy")}
        >
          {words.copyPokemon}
        </button>
        <button
          type="button"
          disabled={!allowed("delete")}
          onClick={() => void perform("delete")}
        >
          {words.deletePokemon}
        </button>
        <button
          type="button"
          disabled={!allowed("overwrite")}
          onClick={() => void perform("overwrite")}
        >
          {boxGalleryWords[lang].overwrite}
        </button>
      </div>
    </details>
  );
}
