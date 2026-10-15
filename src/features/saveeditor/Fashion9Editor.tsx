import { useEffect, useMemo, useRef, useState } from "react";
import { saveCommitHasSound } from "./saveEditSound";
import { Select } from "../shared/Select";
import type { Br4Lang } from "./br4";
import { fashion9Words } from "./fashion9Words";
import {
  FASHION9_FLAGS,
  FASHION9_MAX_BLOCK_BYTES,
  fashion9Frozen,
  fashion9Import,
  fashion9Query,
  fashion9Request,
  isFashion9Page,
  type F9Confirmation,
  type F9Edit,
  type F9Operation,
  type F9Page,
  type F9ReadQuery,
  type F9Row,
  type F9RowChange,
  type F9Ticket,
} from "./fashion9";
import "./Fashion9Editor.css";

type Props = {
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(query: F9ReadQuery): Promise<F9Page | undefined>;
  onPreview(edit: F9Edit): Promise<F9Ticket | undefined>;
  onApply(confirmation: F9Confirmation, sourceSound?: true): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
};
export function Fashion9Editor(props: Props) {
  return <Form key={props.revision} {...props} />;
}
function Form({ busy, lang, onRead, onPreview, onApply, onDiscard }: Props) {
  const w = fashion9Words[lang];
  const [page, setPage] = useState<F9Page>();
  const [query, setQuery] = useState(fashion9Query());
  const [search, setSearch] = useState("");
  const [jump, setJump] = useState("0");
  const [operations, setOperations] = useState<F9Operation[]>([]);
  const [drafts, setDrafts] = useState<Record<string, F9RowChange[]>>({});
  const [snapshot, setSnapshot] = useState<F9Ticket>();
  const [ticket, setTicket] = useState<F9Ticket>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"" | "invalid" | "stale">("");
  const [fileName, setFileName] = useState("");
  const [owned, setOwned] = useState(true);
  const [all, setAll] = useState(false);
  const reader = useRef(onRead),
    discard = useRef(onDiscard);
  const alive = useRef(true),
    request = useRef(0);
  const token = useRef<string | undefined>(undefined);
  const origin = useRef<HTMLElement | null>(null);
  useEffect(() => {
    reader.current = onRead;
    discard.current = onDiscard;
  }, [onRead, onDiscard]);
  useEffect(() => {
    alive.current = true;
    let active = true;
    const id = ++request.current;
    void reader
      .current(fashion9Query())
      .then((p) => {
        if (!active || id !== request.current) return;
        if (isFashion9Page(p)) {
          setPage(p);
          setQuery(fashion9Query(p.group));
        } else setError("invalid");
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
  const staged = useMemo(
    () =>
      new Map(
        snapshot?.rows.map((d) => [d.group + ":" + d.index, d.after]) ?? [],
      ),
    [snapshot],
  );
  const group = page?.groups.find((g) => g.id === query.group);
  const locked = busy || pending || !!ticket;
  const editable = !!page?.canEdit && !locked;
  const flags =
    group?.kind === "za" ? FASHION9_FLAGS : FASHION9_FLAGS.slice(0, 1);
  const label = (id: string) => w.groups[id as keyof typeof w.groups] ?? id;
  function queued(): F9Operation[] {
    return [
      ...operations,
      ...Object.entries(drafts).map(([group, changes]) => ({
        action: "rows" as const,
        group,
        changes,
      })),
    ];
  }
  function rowValue(row: F9Row): F9Row {
    const base = staged.get(query.group + ":" + row.index) ?? row;
    return {
      ...base,
      ...drafts[query.group]?.find((c) => c.index === row.index),
    };
  }
  function edit(
    row: F9Row,
    field: "value" | (typeof FASHION9_FLAGS)[number],
    value: string | boolean,
  ) {
    setDrafts((old) => {
      const rows = old[query.group] ?? [];
      const previous = rows.find((c) => c.index === row.index) ?? {
        index: row.index,
      };
      const change =
        field === "value"
          ? { ...previous, value: String(value) }
          : { ...previous, [field]: value === true };
      return {
        ...old,
        [query.group]: [...rows.filter((c) => c.index !== row.index), change],
      };
    });
  }
  async function load(q: F9ReadQuery) {
    const id = ++request.current;
    setPending(true);
    setError("");
    try {
      const p = await onRead(q);
      if (alive.current && id === request.current) {
        if (!isFashion9Page(p)) throw Error("Invalid Fashion9 page.");
        setPage(p);
        setQuery({ ...q, group: p.group });
      }
    } catch {
      if (alive.current) setError("invalid");
    } finally {
      if (alive.current && id === request.current) setPending(false);
    }
  }
  async function preview(next = queued()) {
    if (!page || locked) return;
    origin.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setPending(true);
    setError("");
    try {
      const edit = fashion9Request(page, next);
      const t = await onPreview(edit);
      if (t && alive.current) {
        try {
          fashion9Frozen(page, t);
        } catch (error) {
          await onDiscard(t.token);
          throw error;
        }
        token.current = t.token;
        setOperations(edit.operations);
        setDrafts({});
        setTicket(t);
        setSnapshot(t);
      } else if (t) await onDiscard(t.token);
    } catch {
      if (alive.current) setError("invalid");
    } finally {
      if (alive.current) setPending(false);
    }
  }
  async function continueEditing() {
    if (!ticket || pending || busy) return;
    setPending(true);
    try {
      await onDiscard(ticket.token);
      token.current = undefined;
      if (alive.current) {
        setTicket(undefined);
        requestAnimationFrame(() => origin.current?.focus());
      }
    } catch {
      if (alive.current) setError("invalid");
    } finally {
      if (alive.current) setPending(false);
    }
  }
  async function importFile(file?: File) {
    if (!file || !page || !group || !editable) return;
    origin.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setPending(true);
    setError("");
    try {
      if (file.size > FASHION9_MAX_BLOCK_BYTES || file.size !== group.bytes)
        throw Error("Invalid Fashion9 block size.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!alive.current) return;
      const edit = fashion9Request(page, [
        ...queued(),
        fashion9Import(group, bytes),
      ]);
      const t = await onPreview(edit);
      if (t && alive.current) {
        try {
          fashion9Frozen(page, t);
        } catch (error) {
          await onDiscard(t.token);
          throw error;
        }
        token.current = t.token;
        setFileName(file.name);
        setOperations(edit.operations);
        setDrafts({});
        setTicket(t);
        setSnapshot(t);
      } else if (t) await onDiscard(t.token);
    } catch {
      if (alive.current) setError("invalid");
    } finally {
      if (alive.current) setPending(false);
    }
  }
  function clear() {
    setOperations([]);
    setDrafts({});
    setSnapshot(undefined);
    setFileName("");
    setError("");
  }
  function download(t: F9Ticket) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(t, null, 2)], {
        type: "application/json;charset=utf-8",
      }),
    );
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = "fashion-preview.json";
      a.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return (
    <section
      className="save-record-editor save-fashion9"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void importFile(e.dataTransfer.files[0]);
      }}
    >
      <h4>{w.title}</h4>
      {!page ? (
        <>
          <p role="status">{w.loading}</p>
          <button
            type="button"
            disabled={locked}
            onClick={() => void load(fashion9Query())}
          >
            {w.search}
          </button>
        </>
      ) : (
        <>
          {!page.canEdit && <p role="status">{w.readOnly}</p>}
          <div className="save-fashion9-controls">
            <label>
              <span>{w.group}</span>
              <Select
                value={query.group}
                disabled={locked}
                onChange={(e) => {
                  setSearch("");
                  setJump("0");
                  void load(fashion9Query(e.target.value));
                }}
              >
                {page.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {label(g.id)} · {g.count}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span>{w.filter}</span>
              <input
                value={search}
                maxLength={32767}
                disabled={locked}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    void load(fashion9Query(query.group, search));
                }}
              />
            </label>
            <button
              type="button"
              disabled={locked}
              onClick={() => void load(fashion9Query(query.group, search))}
            >
              {w.reload}
            </button>
            <label className="save-fashion9-jump">
              <span>{w.physical}</span>
              <input
                inputMode="numeric"
                value={jump}
                maxLength={10}
                disabled={locked}
                onChange={(e) => setJump(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={
                locked ||
                !/^\d+$/.test(jump) ||
                !group ||
                Number(jump) >= group.count
              }
              onClick={() => {
                setSearch("");
                void load(fashion9Query(query.group, "", Number(jump)));
              }}
            >
              {w.jump}
            </button>
          </div>
          <small>
            {group?.count} {w.count} · {group?.bytes} {w.bytes} · {w.draft}:{" "}
            {operations.length} +{" "}
            {Object.values(drafts).reduce((n, rows) => n + rows.length, 0)}
          </small>
          <div className="save-fashion9-table">
            <table>
              <thead>
                <tr>
                  <th>{w.physical}</th>
                  <th>{w.value}</th>
                  {flags.map((f) => (
                    <th key={f}>{w.flags[f]}</th>
                  ))}
                  <th>{w.raw}</th>
                </tr>
              </thead>
              <tbody>
                {page.rows.map((original) => {
                  const row = rowValue(original);
                  return (
                    <tr key={row.index}>
                      <td>{row.index}</td>
                      <td>
                        <input
                          aria-label={`${w.value} ${row.index}`}
                          inputMode="numeric"
                          value={row.value}
                          maxLength={32767}
                          disabled={!editable}
                          onChange={(e) => edit(row, "value", e.target.value)}
                        />
                      </td>
                      {flags.map((f) => (
                        <td key={f} className="save-fashion9-flag">
                          <Select
                            aria-label={`${w.flags[f]} ${row.index}`}
                            value={row[f] ? "true" : "false"}
                            disabled={!editable}
                            onChange={(e) =>
                              edit(row, f, e.target.value === "true")
                            }
                          >
                            <option value="false">{w.false}</option>
                            <option value="true">{w.true}</option>
                          </Select>
                        </td>
                      ))}
                      <td>
                        <details>
                          <summary>{w.raw}</summary>
                          <code>{row.raw}</code>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!page.rows.length && <p>{w.empty}</p>}
          </div>
          <div className="save-editor-toolbar">
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
              {Math.min(query.offset, page.total)}–
              {Math.min(query.offset + page.rows.length, page.total)} /{" "}
              {page.total}
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
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={!editable}
              onClick={() => void preview()}
            >
              {w.preview}
            </button>
            <button
              type="button"
              disabled={
                locked || (!operations.length && !Object.keys(drafts).length)
              }
              onClick={clear}
            >
              {w.clear}
            </button>
          </div>
          <details>
            <summary>{w.import}</summary>
            <p>{w.drop}</p>
            <label>
              <span>
                {label(query.group)} · {group?.bytes} {w.bytes}
              </span>
              <input
                type="file"
                disabled={
                  !editable || !group || group.bytes > FASHION9_MAX_BLOCK_BYTES
                }
                onChange={(e) => {
                  void importFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {fileName && <small>{fileName}</small>}
          </details>
          {page.canOwn && (
            <details>
              <summary>{w.owned}</summary>
              <div className="save-fashion9-controls">
                <label>
                  <span>{w.owned}</span>
                  <Select
                    value={owned ? "true" : "false"}
                    disabled={!editable}
                    onChange={(e) => setOwned(e.target.value === "true")}
                  >
                    <option value="true">{w.own}</option>
                    <option value="false">{w.unown}</option>
                  </Select>
                </label>
                <label>
                  <span>{w.scope}</span>
                  <Select
                    value={all ? "all" : "current"}
                    disabled={!editable}
                    onChange={(e) => setAll(e.target.value === "all")}
                  >
                    <option value="current">{w.current}</option>
                    <option value="all">{w.all}</option>
                  </Select>
                </label>
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() =>
                    void preview([
                      ...queued(),
                      { action: "owned", group: query.group, owned, all },
                    ])
                  }
                >
                  {w.queue}
                </button>
                {group?.kind === "hair" && <small>{w.hairHint}</small>}
              </div>
            </details>
          )}
          <p>{w.hint}</p>
          {ticket && (
            <Review
              ticket={ticket}
              page={page}
              busy={busy || pending}
              lang={lang}
              onBack={() => void continueEditing()}
              onDownload={() => download(ticket)}
              onConfirm={async () => {
                setPending(true);
                setError("");
                try {
                  const applied = await onApply(
                    fashion9Frozen(page, ticket),
                    saveCommitHasSound("fashion9Commit", operations)
                      ? true
                      : undefined,
                  );
                  if (!applied && alive.current) setError("stale");
                } catch {
                  if (alive.current) setError("stale");
                } finally {
                  if (alive.current) setPending(false);
                }
              }}
            />
          )}
        </>
      )}
      {error && <p role="alert">{w[error]}</p>}
    </section>
  );
}
function Review({
  ticket,
  page,
  busy,
  lang,
  onBack,
  onDownload,
  onConfirm,
}: {
  ticket: F9Ticket;
  page: F9Page;
  busy: boolean;
  lang: Br4Lang;
  onBack(): void;
  onDownload(): void;
  onConfirm(): Promise<void>;
}) {
  const w = fashion9Words[lang];
  const [offset, setOffset] = useState(0);
  const label = (id: string) => w.groups[id as keyof typeof w.groups] ?? id;
  function record(row: F9Row) {
    return (
      <>
        <dl>
          <dt>{w.value}</dt>
          <dd>{row.value}</dd>
          {FASHION9_FLAGS.filter((f) => row[f] !== null).map((f) => (
            <div key={f} style={{ display: "contents" }}>
              <dt>{w.flags[f]}</dt>
              <dd>{row[f] ? w.true : w.false}</dd>
            </div>
          ))}
        </dl>
        <code>{row.raw}</code>
      </>
    );
  }
  return (
    <section className="save-fashion9-review" aria-label={w.review}>
      <h4>{w.review}</h4>
      <div className="save-fashion9-hashes">
        <div>
          <p>{w.source}</p>
          <code>{ticket.sourceHash}</code>
        </div>
        <div>
          <p>{w.target}</p>
          <code>{ticket.targetHash}</code>
        </div>
      </div>
      {!!ticket.resetValues.length && (
        <details open>
          <summary>
            {w.reset} · {ticket.resetValues.length}
          </summary>
          <code>
            {ticket.resetValues
              .map((value) => {
                const split = value.lastIndexOf(":");
                return split < 0
                  ? value
                  : `${label(value.slice(0, split))}: ${value.slice(split + 1)}`;
              })
              .join(", ")}
          </code>
        </details>
      )}
      <div className="save-fashion9-table">
        <table>
          <thead>
            <tr>
              <th>{w.group}</th>
              <th>{w.physical}</th>
              <th>{w.before}</th>
              <th>{w.after}</th>
            </tr>
          </thead>
          <tbody>
            {ticket.rows.slice(offset, offset + 20).map((d) => (
              <tr key={d.group + ":" + d.index}>
                <td>{label(d.group)}</td>
                <td>{d.index}</td>
                <td>{record(d.before)}</td>
                <td>{record(d.after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!ticket.rows.length && !ticket.blocks.length && <p>{w.noChanges}</p>}
      </div>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={busy || offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 20))}
        >
          {w.previous}
        </button>
        <span>
          {offset}–{Math.min(offset + 20, ticket.rows.length)} /{" "}
          {ticket.rows.length}
        </span>
        <button
          type="button"
          disabled={busy || offset + 20 >= ticket.rows.length}
          onClick={() => setOffset(offset + 20)}
        >
          {w.next}
        </button>
      </div>
      <details>
        <summary>
          {w.blocks} · {ticket.blocks.length}
        </summary>
        {ticket.blocks.map((b) => (
          <details key={b.key}>
            <summary>
              {label(page.groups.find((g) => g.key === b.key)?.id ?? b.key)} ·{" "}
              {b.key}
            </summary>
            <div className="save-fashion9-hashes">
              <div>
                <p>
                  {w.before} · {b.beforeType}/{b.beforeSubtype}
                </p>
                <code>{b.before}</code>
              </div>
              <div>
                <p>
                  {w.after} · {b.afterType}/{b.afterSubtype}
                </p>
                <code>{b.after}</code>
              </div>
            </div>
          </details>
        ))}
      </details>
      <div className="save-editor-toolbar">
        <button type="button" disabled={busy} onClick={() => void onConfirm()}>
          {w.confirm}
        </button>
        <button type="button" disabled={busy} onClick={onBack}>
          {w.back}
        </button>
        <button type="button" disabled={busy} onClick={onDownload}>
          {w.download}
        </button>
      </div>
    </section>
  );
}
