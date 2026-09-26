import { useTranslation } from "react-i18next";
import { Select } from "../shared/Select";
import {
  changeTrainerCountry,
  type OriginChoice,
  type SaveReport,
  type TrainerDraft,
} from "./domain";
import type { saveEditorResources } from "./locales";

export function TrainerGeographyFields({
  report,
  draft,
  onChange,
}: {
  report: SaveReport;
  draft: TrainerDraft;
  onChange(value: TrainerDraft): void;
}) {
  const { t, i18n } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const geo = report.trainer.geography;
  if (!geo) return null;
  const lang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const regions =
    geo.regions.find((r) => String(r.country) === draft.country)?.choices ?? [];
  const options = (choices: OriginChoice[], value: string) => (
    <>
      {!choices.some((c) => String(c.id) === value) && (
        <option value={value}>#{value}</option>
      )}
      {choices.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name[lang] || `#${c.id}`}
        </option>
      ))}
    </>
  );
  return (
    <>
      <label className="field">
        <span>{words.historyCountry}</span>
        <Select
          value={draft.country}
          onChange={(e) =>
            onChange(changeTrainerCountry(draft, report, e.target.value))
          }
        >
          {options(geo.countries, draft.country)}
        </Select>
      </label>
      <label className="field">
        <span>{words.historyRegion}</span>
        <Select
          value={draft.region}
          disabled={draft.country === "0" || regions.length === 0}
          onChange={(e) => onChange({ ...draft, region: e.target.value })}
        >
          {options(regions, draft.region)}
        </Select>
      </label>
      <label className="field">
        <span>{words.trainerConsoleRegion}</span>
        <Select
          value={draft.consoleRegion}
          onChange={(e) =>
            onChange({ ...draft, consoleRegion: e.target.value })
          }
        >
          {options(geo.consoles, draft.consoleRegion)}
        </Select>
      </label>
    </>
  );
}
