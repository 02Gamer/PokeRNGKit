import { useTranslation } from "react-i18next";
import {
  TRAINER_POSITION_KEYS,
  trainerPositionRange,
  type SaveReport,
  type TrainerDraft,
} from "./domain";
import type { saveEditorResources } from "./locales";

export function TrainerPositionFields({
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
  const position = report.trainer.position;
  if (!position) return null;
  const z = Number(draft.z);
  return (
    <details>
      <summary>{words.trainerPosition}</summary>
      <fieldset className="save-editor-fields" disabled={disabled}>
        {TRAINER_POSITION_KEYS.map((key) => {
          const { min, max } = trainerPositionRange(key);
          return (
            <label key={key} className="field">
              <span>
                {words.trainerPositionNames[key]} · {min}–{max}
              </span>
              <input
                value={draft[key]}
                inputMode={min < 0 ? "text" : "numeric"}
                pattern={min < 0 ? "-?[0-9]+" : "[0-9]+"}
                maxLength={Math.max(
                  String(min).length,
                  String(max).length,
                  String(position[key]).length,
                )}
                onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
              />
            </label>
          );
        })}
      </fieldset>
      {/^-\d+$/.test(draft.z) &&
        Number.isInteger(z) &&
        z >= -65535 &&
        z < 0 && (
          <p className="save-editor-note">
            {words.trainerPositionWrap.replace("{value}", String(z + 65536))}
          </p>
        )}
      <p className="save-editor-note">
        {report.generation === 4
          ? words.trainerPositionMirror
          : words.trainerPositionNote}
      </p>
    </details>
  );
}
