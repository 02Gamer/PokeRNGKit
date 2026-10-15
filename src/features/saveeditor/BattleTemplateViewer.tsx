import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { SaveReport } from "./domain";
import {
  battleTemplateWords,
  type BattleTemplateScope,
  type BattleTemplateQuery,
  type BattleTemplateReport,
} from "./battleTemplate";
import { copyLegalityReport } from "./legalityClipboard";
import { playSaveSound } from "./saveSound";

export function BattleTemplateViewer({
  lang,
  busy,
  report,
  onRead,
  onOpenSettings,
}: {
  lang: "zh" | "en" | "ja";
  busy: boolean;
  report?: SaveReport;
  onRead(query: BattleTemplateQuery): Promise<BattleTemplateReport | undefined>;
  onOpenSettings?(): void;
}) {
  const w = battleTemplateWords[lang];
  const [scope, setScope] = useState<BattleTemplateScope>("single");
  const [box, setBox] = useState(report?.boxOptions.currentBox ?? 0);
  const [position, setPosition] = useState(() => {
    const p = report?.pokemon[0];
    return p ? `${p.box}:${p.slot}` : "";
  });
  const [result, setResult] = useState<BattleTemplateReport>();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
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
  const locked = busy || pending;
  const text = result?.text[lang] ?? "";
  const query: BattleTemplateQuery = !report
    ? { scope: "single" }
    : scope === "single"
      ? {
          scope,
          box: Number(position.split(":")[0]),
          slot: Number(position.split(":")[1]),
        }
      : scope === "box"
        ? { scope, box }
        : { scope };
  function reset() {
    setResult(undefined);
    setMessage("");
  }
  async function run(copy: boolean) {
    if (locked) return;
    const epoch = life.current.epoch;
    const current = () => life.current.alive && life.current.epoch === epoch;
    setPending(true);
    setMessage("");
    if (!copy) setResult(undefined);
    try {
      if (copy) {
        if (!text.trim()) return;
        const status = await copyLegalityReport(text, current);
        if (status === "stale") return;
        setMessage(status === "copied" ? w.copied : w.copyFailed);
        if (status === "copied") playSaveSound("other");
      } else {
        const next = await onRead(query);
        if (!current()) return;
        if (!next) setMessage(w.failed);
        else {
          setResult(next);
          if (!next.text[lang].trim()) setMessage(w.empty);
        }
      }
    } catch {
      if (current()) setMessage(copy ? w.copyFailed : w.failed);
    } finally {
      if (current()) setPending(false);
    }
  }
  return (
    <section aria-label={w.title}>
      {report && (
        <div className="save-editor-fields">
          <label className="field">
            <span>{w.scope}</span>
            <Select
              value={scope}
              disabled={locked}
              onChange={(e) => {
                setScope(e.target.value as BattleTemplateScope);
                reset();
              }}
            >
              <option value="single">{w.single}</option>
              {report.partyCount > 0 && (
                <option value="party">{w.party}</option>
              )}
              {report.boxCount > 0 && (
                <>
                  <option value="box">{w.box}</option>
                  <option value="allBoxes">{w.allBoxes}</option>
                </>
              )}
            </Select>
          </label>
          {scope === "single" && (
            <label className="field">
              <span>{w.pokemon}</span>
              <Select
                value={position}
                disabled={locked || !report.pokemon.length}
                onChange={(e) => {
                  setPosition(e.target.value);
                  reset();
                }}
              >
                {report.pokemon.map((p) => (
                  <option
                    key={`${p.box}:${p.slot}`}
                    value={`${p.box}:${p.slot}`}
                  >
                    {p.box === -1
                      ? w.party
                      : report.boxes.find((b) => b.index === p.box)?.name}{" "}
                    · {p.slot + 1} · {p.nickname || p.speciesName[lang]}
                  </option>
                ))}
              </Select>
            </label>
          )}
          {scope === "box" && (
            <label className="field">
              <span>{w.box}</span>
              <Select
                value={box}
                disabled={locked}
                onChange={(e) => {
                  setBox(Number(e.target.value));
                  reset();
                }}
              >
                {report.boxes.map((b) => (
                  <option key={b.index} value={b.index}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </label>
          )}
        </div>
      )}
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={locked || (!!report && scope === "single" && !position)}
          onClick={() => void run(false)}
        >
          {w.run}
        </button>
        <button
          type="button"
          disabled={locked || !text.trim()}
          onClick={() => void run(true)}
        >
          {w.copy}
        </button>
        {onOpenSettings && (
          <button type="button" disabled={locked} onClick={onOpenSettings}>
            {w.settings}
          </button>
        )}
      </div>
      <p className="save-editor-note">{w.note}</p>
      <p role="status">
        {message || (result ? `${w.count}: ${result.count}` : "")}
      </p>
      {result && (
        <pre className="save-legality-report save-bulk-legality-report">
          {text}
        </pre>
      )}
    </section>
  );
}
