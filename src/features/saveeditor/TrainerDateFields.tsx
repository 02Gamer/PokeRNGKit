import { useTranslation } from "react-i18next";
import { type SaveReport, type TrainerDraft } from "./domain";
import { trainerDateOffset } from "./trainerDates";
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
  if (!dates.length) return null;
  return (
    <details>
      <summary>{words.trainerDates}</summary>
      <fieldset
        className="save-editor-fields save-trainer-dates"
        disabled={disabled}
      >
        {dates.map((field) => {
          const offset = trainerDateOffset(field, draft[field.key]);
          return (
            <label key={field.key} className="field">
              <span>
                {words.trainerDateNames[field.key]} ·{" "}
                {words.trainerDatePrecision[field.kind]}
              </span>
              <input
                type={field.kind === "date" ? "date" : "datetime-local"}
                step={field.kind === "minute" ? 60 : 1}
                min={field.min}
                max={field.max}
                value={draft[field.key]}
                onChange={(e) =>
                  onChange({ ...draft, [field.key]: e.target.value })
                }
              />
              <span className="save-editor-note">
                {field.min.slice(0, 10)}–{field.max.slice(0, 10)}
                {offset && ` · UTC${offset}`}
              </span>
              {!field.value && (
                <span className="save-editor-note">
                  {words.trainerDateEmpty}
                </span>
              )}
            </label>
          );
        })}
      </fieldset>
      <p className="save-editor-note">
        {dates.some((f) => f.kind === "utc")
          ? words.trainerDateUtcNote
          : words.trainerDateNote}
      </p>
    </details>
  );
}
