import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { copyLegalityReport } from "./legalityClipboard";
import { playSaveSound } from "./saveSound";
import { legalityDisplay } from "./legalityDisplay";
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
  const [request, setRequest] = useState({ controlOnly: false, id: 0 });
  const [copyResult, setCopyResult] = useState<{
    report: PokemonLegalityReport;
    status: "copied" | "failed";
  }>();
  const copyStatus =
    copyResult?.report === current ? copyResult?.status : undefined;
  const display = current
    ? legalityDisplay(current, request.controlOnly)
    : undefined;
  const [pendingCopy, setPendingCopy] = useState<{
    report: PokemonLegalityReport;
    lang: string;
  }>();
  const copyPending =
    pendingCopy?.report === current && pendingCopy?.lang === lang;
  const life = useRef({ alive: true, epoch: 0 });
  useEffect(() => {
    const l = life.current;
    l.alive = true;
    l.epoch++;
    return () => {
      l.alive = false;
      l.epoch++;
    };
  }, [current, lang]);
  async function copy() {
    if (busy || copyPending || !current?.clipboard || !display?.canCopy) return;
    const epoch = life.current.epoch;
    const isCurrent = () => life.current.alive && life.current.epoch === epoch;
    setPendingCopy({ report: current, lang });
    const status = await copyLegalityReport(current.clipboard[lang], isCurrent);
    if (status === "stale") return;
    setPendingCopy(undefined);
    setCopyResult({ report: current, status });
    if (status === "copied") playSaveSound("other");
  }
  return (
    <section className="save-pokemon-legality" aria-label={words.legality}>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={busy || copyPending}
          onClick={(event) => {
            setRequest((previous) => ({
              controlOnly:
                event.ctrlKey &&
                !event.shiftKey &&
                !event.altKey &&
                !event.metaKey,
              id: previous.id + 1,
            }));
            setCopyResult(undefined);
            void onAnalyze(position);
          }}
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
          {!display?.hidden && (
            <>
              <p className="save-legality-report">{current.summary[lang]}</p>
              <details key={request.id} open={display?.expanded}>
                <summary>{words.legalityDetails}</summary>
                <p className="save-legality-report">{current.details[lang]}</p>
              </details>
              {display?.canCopy && (
                <div className="save-editor-toolbar">
                  <button
                    type="button"
                    disabled={busy || copyPending}
                    onClick={() => void copy()}
                  >
                    {words.legalityCopy}
                  </button>
                </div>
              )}
              {copyStatus && (
                <p
                  role="status"
                  className={
                    copyStatus === "failed" ? "save-editor-error" : undefined
                  }
                >
                  {copyStatus === "copied"
                    ? words.legalityCopied
                    : words.legalityCopyFailed}
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
