import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import {
  TRAINER_GAME_OPTION_KEYS,
  type SaveReport,
  type TrainerDraft,
} from "./domain";
import type { saveEditorResources } from "./locales";

export function TrainerGameOptionFields({
  report,
  draft,
  disabled,
  onChange,
}: {
  report: SaveReport;
  draft: TrainerDraft;
  disabled: boolean;
  onChange(draft: TrainerDraft): void;
}) {
  const { t } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  if (!report.trainer.gameOptions) return null;
  return (
    <details>
      <summary>{words.trainerGameOptions}</summary>
      <fieldset className="save-editor-fields" disabled={disabled}>
        {TRAINER_GAME_OPTION_KEYS.map((key) => (
          <label key={key} className="field">
            <span>{words.trainerGameOptionNames[key]}</span>
            <Select
              value={draft[key]}
              disabled={disabled}
              onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
            >
              {words.trainerGameOptionChoices[key].map((name, value) => (
                <option
                  key={value}
                  value={value}
                  disabled={
                    key === "textSpeed" &&
                    value > 3 &&
                    value !== report.trainer.gameOptions?.textSpeed
                  }
                >
                  {name}
                </option>
              ))}
            </Select>
          </label>
        ))}
      </fieldset>
      <p className="save-editor-note">{words.trainerGameOptionsNote}</p>
    </details>
  );
}
