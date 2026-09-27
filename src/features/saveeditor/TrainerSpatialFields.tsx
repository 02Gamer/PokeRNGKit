import { useTranslation } from "react-i18next";
import type { SaveReport, TrainerDraft } from "./domain";
import { spatialUnits } from "./trainerSpatialPosition";
import type { saveEditorResources } from "./locales";

export function TrainerSpatialFields({
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
  return (
    <details>
      <summary>{words.trainerPosition}</summary>
      <fieldset className="save-editor-fields" disabled={disabled}>
        {report.trainer.spatialPosition.map((field) => {
          const value = spatialUnits(draft[field.key], field.places);
          const truncated =
            field.truncate &&
            value !== null &&
            value >= spatialUnits(field.min, field.places)! &&
            value <= spatialUnits(field.max, field.places)! &&
            Number(draft[field.key]) !== Math.trunc(Number(draft[field.key]));
          return (
            <label key={field.key} className="field">
              <span>{words.trainerSpatialNames[field.key]}</span>
              <input
                value={draft[field.key]}
                inputMode={
                  field.min.startsWith("-")
                    ? "text"
                    : field.places
                      ? "decimal"
                      : "numeric"
                }
                maxLength={Math.max(
                  field.value.length,
                  field.min.length + (field.places ? field.places + 1 : 0),
                  field.max.length + (field.places ? field.places + 1 : 0),
                )}
                onChange={(e) =>
                  onChange({ ...draft, [field.key]: e.target.value })
                }
              />
              <span className="save-editor-note">
                {field.min}–{field.max} ·{" "}
                {words.trainerSpatialPlaces.replace(
                  "{value}",
                  String(field.places),
                )}
              </span>
              {truncated && (
                <span className="save-editor-note">
                  {words.trainerSpatialTruncate.replace(
                    "{value}",
                    String(Math.trunc(Number(draft[field.key]))),
                  )}
                </span>
              )}
              {!Number.isFinite(Number(field.value)) && (
                <span className="save-editor-note">
                  {words.trainerSpatialInvalid}
                </span>
              )}
            </label>
          );
        })}
      </fieldset>
      <p className="save-editor-note">{words.trainerSpatialNote}</p>
      {report.generation === 6 && (
        <p className="save-editor-note">{words.trainerSpatialGen6}</p>
      )}
      {report.generation === 7 && (
        <p className="save-editor-note">{words.trainerSpatialGen7}</p>
      )}
    </details>
  );
}
