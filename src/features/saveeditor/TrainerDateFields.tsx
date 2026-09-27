import { useTranslation } from "react-i18next";
import {
  TRAINER_DATE_KEYS,
  type SaveReport,
  type TrainerDraft,
} from "./domain";
import type { saveEditorResources } from "./locales";

export function TrainerDateFields({
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
  const dates = report.trainer.dates;
  if (!dates) return null;
  return (
    <details>
      <summary>{words.trainerDates}</summary>
      <fieldset
        className="save-editor-fields save-trainer-dates"
        disabled={disabled}
      >
        {TRAINER_DATE_KEYS.map((key) => (
          <label key={key} className="field">
            <span>{words.trainerDateNames[key]}</span>
            <input
              type="datetime-local"
              step={1}
              min={dates.min}
              max={dates.max}
              value={draft[key]}
              onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
            />
          </label>
        ))}
      </fieldset>
      <p className="save-editor-note">
        {words.trainerDateNote} {dates.min.slice(0, 10)}–
        {dates.max.slice(0, 10)}
      </p>
    </details>
  );
}
