import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { Br4Lang } from "./br4";
import { sevenStar9Words } from "./sevenstar9Words";
import {
  isSevenStar9Page,
  sevenStar9Frozen,
  sevenStar9Query,
  sevenStar9Request,
  type R7Change,
  type R7Confirmation,
  type R7Edit,
  type R7Entry,
  type R7FieldName,
  type R7Page,
  type R7Query,
  type R7Ticket,
} from "./sevenstar9";
import "./SevenStar9Editor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(query: R7Query): Promise<R7Page | undefined>;
  onPreview(edit: R7Edit): Promise<R7Ticket | undefined>;
  onApply(confirmation: R7Confirmation): Promise<void>;
  onDiscard(token: string): Promise<void>;
};
const initialQuery: R7Query = { offset: 0, limit: 50, filter: "" };
const values = (e: R7Entry): Record<R7FieldName, string> => ({
  Identifier: String(e.identifier),
  Captured: String(e.captured),
  Defeated: e.defeated === null ? "" : String(e.defeated),
});
export function SevenStar9Editor(props: Props) {
  return <Form key={props.revision} {...props} />;
}
function Form({ busy, lang, onRead, onPreview, onApply, onDiscard }: Props) {
  const w = sevenStar9Words[lang];
  const [original, setOriginal] = useState<R7Page>(),
    [page, setPage] = useState<R7Page>();
  const [query, setQuery] = useState(initialQuery),
    [search, setSearch] = useState(""),
    [jump, setJump] = useState("1"),
    [index, setIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<number, R7Change["fields"]>>({}),
    draftsRef = useRef<Record<number, R7Change["fields"]>>({});
  const [operations, setOperations] = useState<R7Change[]>([]),
    ops = useRef<R7Change[]>([]);
  const [snapshots, setSnapshots] = useState<Record<number, R7Entry>>({}),
    [ticket, setTicket] = useState<R7Ticket>();
  const [pending, setPending] = useState(false),
    [error, setError] = useState<"" | "invalid" | "stale">("");
  const reader = useRef(onRead),
    discard = useRef(onDiscard),
    alive = useRef(true),
    request = useRef(0),
    token = useRef<string | undefined>(undefined),
    previewTrigger = useRef<HTMLButtonElement | null>(null),
    confirmTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (ticket) confirmTrigger.current?.focus();
  }, [ticket]);
  useEffect(() => {
    reader.current = onRead;
    discard.current = onDiscard;
  }, [onRead, onDiscard]);
  useEffect(() => {
    alive.current = true;
    let active = true;
    const id = ++request.current;
    void reader
      .current(initialQuery)
      .then((p) => {
        if (!active || id !== request.current) return;
        if (!isSevenStar9Page(p)) {
          setError("invalid");
          return;
        }
        setOriginal(p);
        setPage(p);
        setIndex(p.entries[0]?.index ?? 0);
      })
      .catch(() => {
        if (active && id === request.current) setError("invalid");
      });
    return () => {
      active = false;
      alive.current = false;
      if (token.current) void discard.current(token.current);
    };
  }, []);
  const loaded = page?.entries.find((e) => e.index === index),
    entry = loaded ? (snapshots[index] ?? loaded) : undefined;
  const current = entry
    ? {
        ...values(entry),
        ...Object.fromEntries(
          (drafts[index] ?? []).map((f) => [f.name, f.value]),
        ),
      }
    : undefined;
  const locked = busy || pending || !!ticket,
    editable = !!original?.canEdit && !!entry?.canEdit && !locked;
  function stage(changes: R7Change[]) {
    ops.current = changes;
    setOperations(changes);
  }
  function field(name: R7FieldName, value: string) {
    const next = {
      ...draftsRef.current,
      [index]: [
        ...(draftsRef.current[index] ?? []).filter((f) => f.name !== name),
        { name, value },
      ],
    };
    draftsRef.current = next;
    setDrafts(next);
  }
  function queued(): R7Change[] {
    return [
      ...ops.current,
      ...Object.entries(draftsRef.current).map(([i, fields]) => ({
        index: Number(i),
        fields,
      })),
    ];
  }
  async function load(next: R7Query, locate?: number) {
    if (locked) return;
    const id = ++request.current;
    setPending(true);
    setError("");
    try {
      const p = await onRead(sevenStar9Query(next));
      if (!alive.current || id !== request.current) return;
      if (!isSevenStar9Page(p)) throw Error("Invalid SevenStar9 page.");
      if (original && p.sourceHash !== original.sourceHash) {
        setError("stale");
        return;
      }
      if (!original) setOriginal(p);
      setPage(p);
      setQuery(next);
      setIndex(
        locate !== undefined && p.entries.some((e) => e.index === locate)
          ? locate
          : (p.entries[0]?.index ?? 0),
      );
    } catch {
      if (alive.current && id === request.current) setError("invalid");
    } finally {
      if (alive.current && id === request.current) setPending(false);
    }
  }
  async function preview() {
    if (!original || locked) return;
    setPending(true);
    setError("");
    try {
      const edit = sevenStar9Request(original, queued(), lang, query),
        t = await onPreview(edit);
      if (t && alive.current) {
        try {
          sevenStar9Frozen(original, t);
          if (!isSevenStar9Page(t.result))
            throw Error("Invalid SevenStar9 result.");
        } catch (e) {
          await onDiscard(t.token);
          throw e;
        }
        token.current = t.token;
        stage(edit.changes);
        draftsRef.current = {};
        setDrafts({});
        setSnapshots(
          Object.fromEntries(t.entries.map((d) => [d.index, d.after])),
        );
        setTicket(t);
      } else if (t) await onDiscard(t.token);
    } catch {
      if (alive.current) setError("invalid");
    } finally {
      if (alive.current) setPending(false);
    }
  }
  async function back() {
    if (!ticket || busy || pending) return;
    setPending(true);
    try {
      await onDiscard(ticket.token);
      token.current = undefined;
      if (alive.current) {
        setTicket(undefined);
        requestAnimationFrame(() => {
          if (alive.current) previewTrigger.current?.focus();
        });
      }
    } catch {
      if (alive.current) setError("invalid");
    } finally {
      if (alive.current) setPending(false);
    }
  }
  function clear() {
    stage([]);
    draftsRef.current = {};
    setDrafts({});
    setSnapshots({});
    setError("");
  }
  function download() {
    if (!ticket) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(ticket, null, 2)], {
        type: "application/json;charset=utf-8",
      }),
    );
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = "seven-star-raid-preview.json";
      a.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return (
    <section className="save-record-editor save-sevenstar9">
      <h4>{w.title}</h4>
      {!original || !page ? (
        <>
          <p role="status">{error ? w.invalid : w.loading}</p>
          <button
            type="button"
            disabled={locked}
            onClick={() => void load(initialQuery)}
          >
            {w.reload}
          </button>
        </>
      ) : (
        <>
          <p>
            <span>
              {w.records}: {page.count}
            </span>{" "}
            ·{" "}
            <span>
              {w.pairedRecords}:{" "}
              {page.hasDefeatedBlock ? page.defeatedCount : "—"}
            </span>{" "}
            · {page.hasDefeatedBlock ? w.newer : w.legacy}
          </p>
          {!ticket && (
            <>
              <form
                className="save-sevenstar9-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  void load({ ...query, offset: 0, filter: search });
                }}
              >
                <label>
                  <span>{w.search}</span>
                  <input
                    value={search}
                    disabled={locked}
                    maxLength={32767}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <button disabled={locked} type="submit">
                  {w.searchAction}
                </button>
              </form>
              <div className="save-sevenstar9-navigation">
                <label>
                  <span>{w.record}</span>
                  <Select
                    value={index}
                    disabled={locked || !page.entries.length}
                    onChange={(e) => setIndex(Number(e.target.value))}
                  >
                    {page.entries.map((e) => (
                      <option key={e.index} value={e.index}>
                        {w.record} {String(e.index + 1).padStart(4, "0")}
                      </option>
                    ))}
                  </Select>
                </label>
                <form
                  className="save-sevenstar9-search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = Number(jump);
                    if (!Number.isInteger(n) || n < 1 || n > page.count) {
                      setError("invalid");
                      return;
                    }
                    setSearch("");
                    void load(
                      {
                        ...query,
                        offset: Math.floor((n - 1) / query.limit) * query.limit,
                        filter: "",
                      },
                      n - 1,
                    );
                  }}
                >
                  <label>
                    <span>{w.jump}</span>
                    <input
                      type="number"
                      min={1}
                      max={page.count}
                      step={1}
                      value={jump}
                      disabled={locked}
                      onChange={(e) => setJump(e.target.value)}
                    />
                  </label>
                  <button disabled={locked || !page.count} type="submit">
                    {w.go}
                  </button>
                </form>
              </div>
              <div className="save-review-actions">
                <button
                  type="button"
                  disabled={locked || query.offset === 0}
                  onClick={() =>
                    void load({
                      ...query,
                      offset: Math.max(0, query.offset - query.limit),
                    })
                  }
                >
                  {w.previous}
                </button>
                <span>
                  {w.match}: {page.total} ·{" "}
                  {page.entries.length ? query.offset + 1 : 0}–
                  {query.offset + page.entries.length}
                </span>
                <button
                  type="button"
                  disabled={locked || query.offset + query.limit >= page.total}
                  onClick={() =>
                    void load({ ...query, offset: query.offset + query.limit })
                  }
                >
                  {w.next}
                </button>
              </div>
              {entry && current ? (
                <>
                  {!entry.canEdit && <p role="status">{w.incomplete}</p>}
                  <div className="save-sevenstar9-fields">
                    <label>
                      <span>{w.identifier}</span>
                      <input
                        value={current.Identifier}
                        maxLength={32767}
                        disabled={!editable}
                        onChange={(e) => field("Identifier", e.target.value)}
                      />
                    </label>
                    {(["Captured", "Defeated"] as const).map((name) => (
                      <label key={name}>
                        <span>
                          {name === "Captured" ? w.captured : w.defeated}
                        </span>
                        <Select
                          value={current[name]}
                          disabled={!editable}
                          onChange={(e) => field(name, e.target.value)}
                        >
                          {current[name] === "" && <option value="">—</option>}
                          <option value="true">{w.yes}</option>
                          <option value="false">{w.no}</option>
                        </Select>
                      </label>
                    ))}
                  </div>
                  <small>{w.identifierHint}</small>
                  <details>
                    <summary>{w.raw}</summary>
                    <dl>
                      <dt>{w.pairedIdentifier}</dt>
                      <dd>{entry.defeatedIdentifier ?? "—"}</dd>
                      <dt>{w.captureRaw}</dt>
                      <dd>
                        <code>{entry.captureRaw}</code>
                      </dd>
                      <dt>{w.defeatedRaw}</dt>
                      <dd>
                        <code>{entry.defeatedRaw ?? "—"}</code>
                      </dd>
                    </dl>
                  </details>
                </>
              ) : (
                <p role="status">{w.none}</p>
              )}
              <small>
                {w.drafts}: {Object.keys(drafts).length} · {w.queued}:{" "}
                {operations.length}
              </small>
              <div className="save-review-actions">
                <button
                  type="button"
                  ref={previewTrigger}
                  disabled={locked || !original.canEdit}
                  onClick={() => void preview()}
                >
                  {w.preview}
                </button>
                <button
                  type="button"
                  disabled={
                    locked ||
                    (!operations.length && !Object.keys(drafts).length)
                  }
                  onClick={clear}
                >
                  {w.clear}
                </button>
              </div>
              <small>{w.hint}</small>
            </>
          )}
          {ticket && (
            <div className="save-sevenstar9-review">
              <h4>{w.review}</h4>
              <dl>
                <dt>{w.source}</dt>
                <dd>
                  <code>{ticket.sourceHash}</code>
                </dd>
                <dt>{w.target}</dt>
                <dd>
                  <code>{ticket.targetHash}</code>
                </dd>
              </dl>
              {!ticket.entries.length && <p>{w.noChanges}</p>}
              <Review entries={ticket.entries} lang={lang} />
              <details>
                <summary>
                  {w.blocks} ({ticket.blocks.length})
                </summary>
                {ticket.blocks.map((b) => (
                  <div key={b.key}>
                    <h4>{b.key}</h4>
                    <p>
                      {b.beforeType}/{b.beforeSubtype} → {b.afterType}/
                      {b.afterSubtype}
                    </p>
                    <div className="save-sevenstar9-pair">
                      <div>
                        <strong>{w.before}</strong>
                        <code>{b.before}</code>
                      </div>
                      <div>
                        <strong>{w.after}</strong>
                        <code>{b.after}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </details>
              <div className="save-review-actions">
                <button
                  type="button"
                  disabled={busy || pending}
                  onClick={() => {
                    if (original)
                      void onApply(sevenStar9Frozen(original, ticket)).catch(
                        () => {
                          if (alive.current) setError("stale");
                        },
                      );
                  }}
                  ref={confirmTrigger}
                >
                  {w.confirm}
                </button>
                <button
                  type="button"
                  disabled={busy || pending}
                  onClick={() => void back()}
                >
                  {w.back}
                </button>
                <button type="button" onClick={download}>
                  {w.download}
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {error && original && <p role="alert">{w[error]}</p>}
    </section>
  );
}
function Review({
  entries,
  lang,
}: {
  entries: R7Ticket["entries"];
  lang: Br4Lang;
}) {
  const w = sevenStar9Words[lang],
    [offset, setOffset] = useState(0);
  const value = (e: R7Entry) => (
    <dl>
      <dt>{w.identifier}</dt>
      <dd>{e.identifier}</dd>
      <dt>{w.captured}</dt>
      <dd>{e.captured ? w.yes : w.no}</dd>
      <dt>{w.defeated}</dt>
      <dd>{e.defeated === null ? "—" : e.defeated ? w.yes : w.no}</dd>
      <dt>{w.pairedIdentifier}</dt>
      <dd>{e.defeatedIdentifier ?? "—"}</dd>
      <dt>{w.captureRaw}</dt>
      <dd>
        <code>{e.captureRaw}</code>
      </dd>
      <dt>{w.defeatedRaw}</dt>
      <dd>
        <code>{e.defeatedRaw ?? "—"}</code>
      </dd>
    </dl>
  );
  return entries.length ? (
    <>
      <div className="save-sevenstar9-table">
        <table>
          <thead>
            <tr>
              <th>{w.record}</th>
              <th>{w.before}</th>
              <th>{w.after}</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(offset, offset + 20).map((d) => (
              <tr key={d.index}>
                <td>{d.index + 1}</td>
                <td>{value(d.before)}</td>
                <td>{value(d.after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="save-review-actions">
        <button
          type="button"
          disabled={!offset}
          onClick={() => setOffset(Math.max(0, offset - 20))}
        >
          {w.previous}
        </button>
        <span>
          {offset + 1}–{Math.min(offset + 20, entries.length)} /{" "}
          {entries.length}
        </span>
        <button
          type="button"
          disabled={offset + 20 >= entries.length}
          onClick={() => setOffset(offset + 20)}
        >
          {w.next}
        </button>
      </div>
    </>
  ) : null;
}
