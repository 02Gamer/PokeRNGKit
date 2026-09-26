import { useTranslation } from "react-i18next";
import type { PokemonLegalityReport, PokemonPosition } from "./domain";
import type { saveEditorResources } from "./locales";

export function PokemonLegality({
  position,
  report,
  busy,
  onAnalyze,
}: {
  position: PokemonPosition;
  report?: PokemonLegalityReport;
  busy: boolean;
  onAnalyze(position: PokemonPosition): Promise<void>;
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
  const current =
    report?.box === position.box && report.slot === position.slot
      ? report
      : undefined;
  return (
    <section className="save-pokemon-legality" aria-label={words.legality}>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onAnalyze(position)}
        >
          {words.checkLegality}
        </button>
      </div>
      <p className="save-editor-note">{words.legalityNote}</p>
      {current && (
        <>
          <p
            role="status"
            className={
              !current.parsed || !current.valid
                ? "save-editor-error"
                : undefined
            }
          >
            {!current.parsed
              ? words.legalityIncomplete
              : current.valid
                ? words.legalityValid
                : words.legalityInvalid}
          </p>
          <p className="save-legality-report">{current.summary[lang]}</p>
          <details>
            <summary>{words.legalityDetails}</summary>
            <p className="save-legality-report">{current.details[lang]}</p>
          </details>
        </>
      )}
    </section>
  );
}
