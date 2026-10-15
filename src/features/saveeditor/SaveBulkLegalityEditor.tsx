import { useEffect, useRef, useState } from "react";
import { bulkLegalityWords, type SaveBulkLegalityReport } from "./bulkLegality";
import { playSaveSound } from "./saveSound";

export function SaveBulkLegalityEditor({
  lang,
  busy,
  onRead,
  onOpenSettings,
}: {
  lang: "zh" | "en" | "ja";
  busy: boolean;
  onRead(): Promise<SaveBulkLegalityReport | undefined>;
  onOpenSettings(): void;
}) {
  const w = bulkLegalityWords[lang];
  const [result, setResult] = useState<SaveBulkLegalityReport>();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const life = useRef({ alive: true, epoch: 0 });
  useEffect(() => {
    const l = life.current;
    l.alive = true;
    l.epoch++;
    return () => {
      l.alive = false;
      l.epoch++;
    };
  }, [lang]);
  async function run(copy: boolean) {
    if (busy || pending) return;
    const epoch = life.current.epoch;
    const current = () => life.current.alive && life.current.epoch === epoch;
    setPending(true);
    setMessage("");
    if (!copy) setResult(undefined);
    try {
      if (copy) {
        if (!result) return;
        await navigator.clipboard.writeText(result.report[lang]);
        if (!current()) return;
        playSaveSound("other");
        setMessage(w.copied);
      } else {
        const next = await onRead();
        if (!current()) return;
        if (next) setResult(next);
        else setMessage(w.failed);
      }
    } catch {
      if (current()) setMessage(copy ? w.copyFailed : w.failed);
    } finally {
      if (current()) setPending(false);
    }
  }
  return (
    <section aria-label={w.title}>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={busy || pending}
          onClick={() => void run(false)}
        >
          {w.run}
        </button>
        <button
          type="button"
          disabled={busy || pending || !result}
          onClick={() => void run(true)}
        >
          {w.copy}
        </button>
        <button
          type="button"
          disabled={busy || pending}
          onClick={onOpenSettings}
        >
          {w.settings}
        </button>
      </div>
      <p>{w.hint}</p>
      <p role="status">
        {message ||
          (result
            ? `${result.clean ? w.clean : w.findings} · ${w.analyzed}: ${result.analyzedCount} · ${w.count}: ${result.findingCount}`
            : "")}
      </p>
      {result && (
        <pre className="save-legality-report save-bulk-legality-report">
          {result.report[lang]}
        </pre>
      )}
    </section>
  );
}
