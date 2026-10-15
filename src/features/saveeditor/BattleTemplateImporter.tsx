import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { SaveReport } from "./domain";
import {
  battleImportWords,
  MAX_BATTLE_TEMPLATE_TEXT,
  type BattleTemplateTarget,
  type BattleTemplateImportActions,
  type BattleTemplateImportTicket,
} from "./battleTemplateImport";

export function BattleTemplateImporter({
  lang,
  busy,
  report,
  fileTarget,
  actions,
}: {
  lang: "zh" | "en" | "ja";
  busy: boolean;
  report?: SaveReport;
  fileTarget?: BattleTemplateTarget;
  actions: BattleTemplateImportActions;
}) {
  const w = battleImportWords[lang];
  const [box, setBox] = useState(
    report?.boxCount ? report.boxOptions.currentBox : -1,
  );
  const [slot, setSlot] = useState(0);
  const [text, setText] = useState("");
  const [ticket, setTicket] = useState<BattleTemplateImportTicket>();
  const [ack, setAck] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const life = useRef({ alive: true, epoch: 0 });
  const ticketRef = useRef<BattleTemplateImportTicket | undefined>(undefined);
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);
  useEffect(() => {
    const l = life.current;
    l.alive = true;
    l.epoch++;
    return () => {
      l.alive = false;
      l.epoch++;
      const old = ticketRef.current;
      ticketRef.current = undefined;
      if (old) void actionsRef.current.discard(old.token).catch(() => {});
    };
  }, [lang]);
  const locked = busy || pending;
  const count = report
    ? box === -1
      ? report.partyCount
      : report.boxSlotCount
    : 1;
  const target: BattleTemplateTarget = fileTarget ?? {
    kind: "save",
    box,
    slot,
    fileName: null,
    inputEncrypted: false,
    useFileFormat: false,
  };
  const available =
    !!fileTarget ||
    (!!report &&
      (box === -1
        ? report.partyCount > 0
        : report.boxes.some((b) => b.index === box)) &&
      slot >= 0 &&
      slot < count);
  function clear() {
    const old = ticketRef.current;
    ticketRef.current = undefined;
    setTicket(undefined);
    setAck(false);
    setMessage("");
    if (old) void actions.discard(old.token).catch(() => {});
  }
  async function run(apply: boolean) {
    if (
      locked ||
      !available ||
      !text.trim() ||
      (apply && (!ticket || (ticket.issues.length > 0 && !ack)))
    )
      return;
    const epoch = life.current.epoch;
    const current = () => life.current.alive && life.current.epoch === epoch;
    setPending(true);
    setMessage("");
    try {
      if (apply && ticket) {
        const applied = await actions.apply({
          token: ticket.token,
          sourceHash: ticket.sourceHash,
          targetHash: ticket.targetHash,
          target: ticket.target,
          acceptIssues: ack,
        });
        if (!current()) return;
        if (applied) {
          ticketRef.current = undefined;
          setTicket(undefined);
          setMessage(w.applied);
        } else setMessage(w.failed);
      } else {
        clear();
        const next = await actions.preview(target, text);
        if (!current()) {
          if (next) await actions.discard(next.token);
          return;
        }
        if (next) {
          ticketRef.current = next;
          setTicket(next);
        } else setMessage(w.failed);
      }
    } catch {
      if (current()) setMessage(w.failed);
    } finally {
      if (current()) setPending(false);
    }
  }
  return (
    <section aria-label={w.title}>
      <h3>{w.title}</h3>
      <p className="save-editor-note">{w.note}</p>
      {report && (
        <div className="save-editor-fields">
          <label className="field">
            <span>{w.box}</span>
            <Select
              value={box}
              disabled={locked}
              onChange={(e) => {
                setBox(Number(e.target.value));
                setSlot(0);
                clear();
              }}
            >
              {report.partyCount > 0 && <option value={-1}>{w.party}</option>}
              {report.boxes.map((b) => (
                <option key={b.index} value={b.index}>
                  {b.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="field">
            <span>{w.slot}</span>
            <Select
              value={slot}
              disabled={locked || !count}
              onChange={(e) => {
                setSlot(Number(e.target.value));
                clear();
              }}
            >
              {Array.from({ length: count }, (_, i) => {
                const p = report.pokemon.find(
                  (p) => p.box === box && p.slot === i,
                );
                return (
                  <option key={i} value={i}>
                    {i + 1} · {p?.nickname || p?.speciesName[lang] || w.empty}
                  </option>
                );
              })}
            </Select>
          </label>
        </div>
      )}
      <label className="field">
        <span>{w.input}</span>
        <textarea
          rows={8}
          maxLength={MAX_BATTLE_TEMPLATE_TEXT}
          value={text}
          disabled={locked}
          onChange={(e) => {
            setText(e.target.value);
            clear();
          }}
        />
      </label>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={locked || !available || !text.trim()}
          onClick={() => void run(false)}
        >
          {w.preview}
        </button>
        <button
          type="button"
          disabled={locked || !ticket || (ticket.issues.length > 0 && !ack)}
          onClick={() => void run(true)}
        >
          {w.apply}
        </button>
        <button type="button" disabled={locked || !ticket} onClick={clear}>
          {w.discard}
        </button>
      </div>
      <p role="status">{message}</p>
      {ticket && (
        <>
          <details>
            <summary>{w.before}</summary>
            <pre className="save-legality-report">{ticket.before[lang]}</pre>
          </details>
          <details>
            <summary>{w.parsed}</summary>
            <pre className="save-legality-report">{ticket.parsed[lang]}</pre>
          </details>
          <h4>{w.result}</h4>
          <pre className="save-legality-report save-bulk-legality-report">
            {ticket.result[lang]}
          </pre>
          <dl className="save-editor-summary">
            <div>
              <dt>{w.bytes}</dt>
              <dd>{ticket.changedBytes}</dd>
            </div>
            <div>
              <dt>{w.pid}</dt>
              <dd>
                {ticket.beforePid} → {ticket.resultPid}
              </dd>
            </div>
            <div>
              <dt>{w.ec}</dt>
              <dd>
                {ticket.beforeEncryptionConstant} →{" "}
                {ticket.resultEncryptionConstant}
              </dd>
            </div>
          </dl>
          <p className="save-editor-note">{w.random}</p>
          {ticket.issues.length > 0 && (
            <>
              <h4>{w.issues}</h4>
              <ul>
                {ticket.issues.map((issue, i) => (
                  <li key={i}>{issue[lang]}</li>
                ))}
              </ul>
              <label>
                <input
                  type="checkbox"
                  checked={ack}
                  disabled={locked}
                  onChange={(e) => setAck(e.target.checked)}
                />{" "}
                {w.ack}
              </label>
            </>
          )}
        </>
      )}
    </section>
  );
}
