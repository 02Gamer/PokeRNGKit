import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { Br4Lang } from "./br4";
import {
  event9aReadQuery,
  event9aRequest,
  event9aFrozen,
  EVENT9A_MAX_NAMES,
  type Ew9aPage,
  type Ew9aReadQuery,
  type Ew9aEdit,
  type Ew9aConfirmation,
  type Ew9aRowChange,
  type Ew9aRow,
  type Ew9aTicket,
  type Ew9aComparison,
  type Ew9aPhysicalDiff,
  type Ew9aBlockChange,
} from "./event9a";
import { event9aWords } from "./event9aWords";
import "./Event9aEditor.css";
import { blockKeyDefaults, blockKeyWords } from "./blockKeyDefaults";
import { readSaveSettings } from "./settingsRepository";

type Props = {
  format: string;
  revision: number;
  busy: boolean;
  lang: Br4Lang;
  onRead(query: Ew9aReadQuery): Promise<Ew9aPage | undefined>;
  onPreview(edit: Ew9aEdit): Promise<Ew9aTicket | undefined>;
  onApply(edit: Ew9aConfirmation): Promise<void>;
  onDiscard(token: string): Promise<void>;
  onCompare(
    old: File,
    newer: File,
    names: string,
  ): Promise<Ew9aComparison | undefined>;
};
export function Event9aEditor(p: Props) {
  return <Form key={`${p.revision}:${p.format}`} {...p} />;
}
function Form({
  format,
  busy,
  lang,
  onRead,
  onPreview,
  onApply,
  onDiscard,
  onCompare,
}: Props) {
  const w = event9aWords[lang];
  const [page, setPage] = useState<Ew9aPage>();
  const [query, setQuery] = useState(event9aReadQuery(""));
  const [search, setSearch] = useState("");
  const [jump, setJump] = useState("0");
  const [namesInput, setNamesInput] = useState("");
  const [resourceFailed, setResourceFailed] = useState(false);
  const initial = useRef<
    | Promise<{
        page: Ew9aPage | undefined;
        defaults: Awaited<ReturnType<typeof blockKeyDefaults>>;
      }>
    | undefined
  >(undefined);
  const [changes, setChanges] = useState<Ew9aRowChange[]>([]);
  const [ticket, setTicket] = useState<Ew9aTicket>();
  const [comparison, setComparison] = useState<Ew9aComparison>();
  const [oldFile, setOldFile] = useState<File>();
  const [newFile, setNewFile] = useState<File>();
  const [dropped, setDropped] = useState<File[]>([]);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState("");
  const reader = useRef(onRead),
    discard = useRef(onDiscard);
  const token = useRef<string | undefined>(undefined),
    origin = useRef<HTMLElement | null>(null);
  const alive = useRef(true),
    request = useRef(0);
  const initialFailed = useEffectEvent(() => setError(w.invalid));
  useEffect(() => {
    reader.current = onRead;
    discard.current = onDiscard;
  }, [onRead, onDiscard]);
  useEffect(() => {
    alive.current = true;
    let active = true;
    const id = ++request.current;
    initial.current ??= Promise.resolve()
      .then(() =>
        blockKeyDefaults(format, true, readSaveSettings()?.json ?? ""),
      )
      .then(async (defaults) => ({
        defaults,
        page: await reader.current(event9aReadQuery(defaults.names)),
      }));
    void initial.current
      .then(({ page, defaults }) => {
        if (active && id === request.current) {
          if (page) setPage(page);
          setQuery(event9aReadQuery(defaults.names));
          setNamesInput(defaults.names);
          setResourceFailed(defaults.failed);
        }
      })
      .catch(() => {
        if (active && id === request.current) initialFailed();
      })
      .finally(() => {
        if (active && id === request.current) setPending(false);
      });
    return () => {
      active = false;
      alive.current = false;
      if (token.current) void discard.current(token.current);
    };
  }, [format]);
  const locked = busy || pending || !!ticket;
  const group = page?.groups.find((g) => g.id === query.group);
  const label = (id: string) => w.groups[id as keyof typeof w.groups] ?? id;
  async function load(q: Ew9aReadQuery) {
    const id = ++request.current;
    setPending(true);
    setError("");
    try {
      const p = await onRead(q);
      if (alive.current && id === request.current && p) {
        setPage(p);
        setQuery(q);
      }
    } catch {
      if (alive.current) setError(w.invalid);
    } finally {
      if (alive.current && id === request.current) setPending(false);
    }
  }
  function edit(row: Ew9aRow, key: number | "value", value: string) {
    setChanges((old) => {
      const existing = old.find(
        (c) => c.group === query.group && c.index === row.index,
      );
      const change: Ew9aRowChange = existing
        ? { ...existing }
        : { group: query.group, index: row.index };
      if (key === "value") change.value = value;
      else {
        change.keys = [...(existing?.keys ?? row.keys.map(() => null))];
        change.keys[key] = value;
      }
      return [
        ...old.filter((c) => c.group !== query.group || c.index !== row.index),
        change,
      ];
    });
  }
  async function preview() {
    if (!page) return;
    origin.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setPending(true);
    setError("");
    try {
      const t = await onPreview(event9aRequest(page, query.names, changes));
      if (t && alive.current) {
        token.current = t.token;
        setTicket(t);
      } else if (t) await onDiscard(t.token);
    } catch {
      if (alive.current) setError(w.invalid);
    } finally {
      if (alive.current) setPending(false);
    }
  }
  async function cancel() {
    if (!ticket) return;
    setPending(true);
    try {
      await onDiscard(ticket.token);
      token.current = undefined;
      setTicket(undefined);
      requestAnimationFrame(() => origin.current?.focus());
    } catch {
      setError(w.invalid);
    } finally {
      setPending(false);
    }
  }
  async function nameFile(file?: File) {
    if (!file || locked || changes.length) return;
    setPending(true);
    setError("");
    try {
      if (file.size > EVENT9A_MAX_NAMES * 4)
        throw Error("Event9a name file too large.");
      const text = await file.text();
      if (text.length > EVENT9A_MAX_NAMES)
        throw Error("Event9a name table too large.");
      if (alive.current) setNamesInput(text);
    } catch {
      if (alive.current) setError(w.invalid);
    } finally {
      if (alive.current) setPending(false);
    }
  }
  async function compare() {
    if (!oldFile || !newFile) return;
    setPending(true);
    setError("");
    try {
      const result = await onCompare(oldFile, newFile, query.names);
      if (alive.current && result) setComparison(result);
    } catch {
      if (alive.current) setError(w.invalid);
    } finally {
      if (alive.current) setPending(false);
    }
  }
  function download() {
    if (!comparison) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(comparison, null, 2)], {
        type: "application/json;charset=utf-8",
      }),
    );
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = "Z-A-events-comparison.json";
      a.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return (
    <section
      className="save-record-editor save-event9a"
      onDragOver={(e) => {
        if (!locked) e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (locked) return;
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 1 && files[0].name.toLowerCase().endsWith(".txt"))
          void nameFile(files[0]);
        else setDropped(files);
      }}
    >
      <h3>{w.title}</h3>
      {resourceFailed && (
        <p className="save-editor-note" role="status">
          {blockKeyWords[lang].failed}
        </p>
      )}
      {!page ? (
        <button
          type="button"
          disabled={locked}
          onClick={() => void load(query)}
        >
          {w.read}
        </button>
      ) : (
        <>
          {!page.canEdit && <p role="status">{w.readonly}</p>}
          <div className="save-event9a-controls">
            <label>
              <span>{w.group}</span>
              <Select
                value={query.group}
                disabled={locked}
                onChange={(e) => {
                  setSearch("");
                  setJump("0");
                  void load(event9aReadQuery(query.names, e.target.value));
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
              <span>{w.search}</span>
              <input
                value={search}
                maxLength={32767}
                disabled={locked}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    void load(
                      event9aReadQuery(query.names, query.group, search),
                    );
                }}
              />
            </label>
            <button
              type="button"
              disabled={locked}
              onClick={() =>
                void load(event9aReadQuery(query.names, query.group, search))
              }
            >
              {w.searchApply}
            </button>
          </div>
          <p>
            {w.count}: {group?.count ?? 0} · {w.used}: {group?.used ?? 0} ·{" "}
            {w.matches}: {page.total}
          </p>
          {!group?.available && <p role="status">{w.unavailable}</p>}
          <div className="save-event9a-table" tabIndex={0} aria-label={w.group}>
            <table>
              <thead>
                <tr>
                  <th>{w.index}</th>
                  <th>{w.key}</th>
                  <th>{w.value}</th>
                </tr>
              </thead>
              <tbody>
                {page.rows.map((row) => {
                  const draft = changes.find(
                    (c) => c.group === query.group && c.index === row.index,
                  );
                  return (
                    <tr key={row.index}>
                      <td>
                        {row.index}
                        <details>
                          <summary>{w.raw}</summary>
                          <code>{row.raw}</code>
                        </details>
                      </td>
                      <td>
                        {row.keys.map((base, k) => (
                          <label key={k}>
                            <span>
                              {group?.kind === "tuple" && k === 1
                                ? w.signed
                                : `${w.key} ${k + 1}`}
                            </span>
                            <input
                              value={draft?.keys?.[k] ?? base}
                              maxLength={32767}
                              disabled={locked || !page.canEdit}
                              onChange={(e) => edit(row, k, e.target.value)}
                            />
                            <small>{row.hashes[k]}</small>
                          </label>
                        ))}
                      </td>
                      <td>
                        {group?.kind === "bool" ? (
                          <Select
                            value={(draft?.value ?? row.value).toLowerCase()}
                            disabled={locked || !page.canEdit}
                            aria-label={`${w.value} ${row.index}`}
                            onChange={(e) => edit(row, "value", e.target.value)}
                          >
                            <option value="true">{w.true}</option>
                            <option value="false">{w.false}</option>
                          </Select>
                        ) : (
                          <input
                            aria-label={`${w.value} ${row.index}`}
                            value={draft?.value ?? row.value}
                            inputMode="numeric"
                            maxLength={32767}
                            disabled={locked || !page.canEdit}
                            onChange={(e) => edit(row, "value", e.target.value)}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!page.rows.length && <p>{w.empty}</p>}
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked || query.offset === 0}
              onClick={() =>
                void load(
                  event9aReadQuery(
                    query.names,
                    query.group,
                    query.filter,
                    Math.max(0, query.offset - query.limit),
                    query.limit,
                  ),
                )
              }
            >
              {w.previous}
            </button>
            <span>
              {page.total ? query.offset + 1 : 0}–
              {Math.min(query.offset + page.rows.length, page.total)} /{" "}
              {page.total}
            </span>
            <button
              type="button"
              disabled={locked || query.offset + query.limit >= page.total}
              onClick={() =>
                void load(
                  event9aReadQuery(
                    query.names,
                    query.group,
                    query.filter,
                    query.offset + query.limit,
                    query.limit,
                  ),
                )
              }
            >
              {w.next}
            </button>
          </div>
          <div className="save-event9a-controls">
            <label>
              <span>{w.jump}</span>
              <input
                type="number"
                min={0}
                max={Math.max(0, (group?.count ?? 0) - 1)}
                step={1}
                value={jump}
                disabled={locked}
                onChange={(e) => setJump(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={
                locked ||
                !Number.isInteger(Number(jump)) ||
                Number(jump) < 0 ||
                Number(jump) >= (group?.count ?? 0)
              }
              onClick={() => {
                setSearch("");
                void load(
                  event9aReadQuery(query.names, query.group, "", Number(jump)),
                );
              }}
            >
              {w.go}
            </button>
          </div>
          <p>
            {w.draft}: {changes.length}
          </p>
          <p className="save-editor-note">{w.saveHint}</p>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked || !page.canEdit}
              onClick={() => void preview()}
            >
              {w.preview}
            </button>
            <button
              type="button"
              disabled={locked || !changes.length}
              onClick={() => setChanges([])}
            >
              {w.discard}
            </button>
          </div>
          <details>
            <summary>{w.names}</summary>
            <label>
              <span>{w.namesFile}</span>
              <input
                type="file"
                accept=".txt"
                disabled={locked || !!changes.length}
                onChange={(e) => {
                  void nameFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <textarea
              aria-label={w.names}
              value={namesInput}
              maxLength={EVENT9A_MAX_NAMES}
              disabled={locked || !!changes.length}
              onChange={(e) => setNamesInput(e.target.value)}
            />
            <p>{w.nameHint}</p>
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={locked || !!changes.length}
                onClick={() => {
                  setComparison(undefined);
                  setSearch("");
                  void load(event9aReadQuery(namesInput, query.group));
                }}
              >
                {w.loadNames}
              </button>
              <button
                type="button"
                disabled={locked || !!changes.length}
                onClick={() => {
                  setNamesInput("");
                  setComparison(undefined);
                  setSearch("");
                  void load(event9aReadQuery("", query.group));
                }}
              >
                {w.clearNames}
              </button>
            </div>
          </details>
          <details>
            <summary>{w.compare}</summary>
            <p>{w.dropHint}</p>
            <div className="save-event9a-controls">
              {[
                { name: w.oldFile, set: setOldFile, file: oldFile },
                { name: w.newFile, set: setNewFile, file: newFile },
              ].map((f) => (
                <label key={f.name}>
                  <span>{f.name}</span>
                  <input
                    type="file"
                    disabled={locked}
                    onChange={(e) => {
                      f.set(e.target.files?.[0]);
                      setComparison(undefined);
                    }}
                  />
                  {f.file && <small>{f.file.name}</small>}
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={locked || !oldFile || !newFile}
              onClick={() => void compare()}
            >
              {w.compareAction}
            </button>
          </details>
          {dropped.length > 0 && (
            <div
              className="save-event9a-review"
              role="group"
              aria-label={w.compare}
            >
              <p>{dropped[0].name}</p>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    setOldFile(dropped[0]);
                    setComparison(undefined);
                    setDropped((files) => files.slice(1));
                  }}
                >
                  {w.dropOld}
                </button>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    setNewFile(dropped[0]);
                    setComparison(undefined);
                    setDropped((files) => files.slice(1));
                  }}
                >
                  {w.dropNew}
                </button>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => setDropped([])}
                >
                  {w.dropCancel}
                </button>
              </div>
            </div>
          )}
          {ticket && (
            <div className="save-event9a-review" aria-label={w.preview}>
              <p>
                {w.bytes}: {ticket.changedOffsets.length}
              </p>
              <code>
                {ticket.sourceHash}
                <br />
                {ticket.targetHash}
              </code>
              {ticket.ignored.length > 0 && (
                <details>
                  <summary>
                    {w.ignored}: {ticket.ignored.length}
                  </summary>
                  <code>{ticket.ignored.join("\n")}</code>
                </details>
              )}
              <Diff
                key={ticket.token}
                rows={ticket.rows}
                blocks={ticket.blocks}
                lang={lang}
              />
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={busy || pending}
                  onClick={async () => {
                    setPending(true);
                    setError("");
                    try {
                      await onApply(event9aFrozen(page, ticket));
                      token.current = undefined;
                    } catch {
                      setError(w.invalid);
                    } finally {
                      if (alive.current) setPending(false);
                    }
                  }}
                >
                  {w.apply}
                </button>
                <button
                  type="button"
                  disabled={busy || pending}
                  onClick={() => void cancel()}
                >
                  {w.cancel}
                </button>
              </div>
            </div>
          )}
          {comparison && (
            <section className="save-event9a-review" aria-label={w.compare}>
              <h4>{w.compare}</h4>
              <code>
                {comparison.previousHash}
                <br />
                {comparison.updatedHash}
              </code>
              <Diff
                key={`${comparison.previousHash}:${comparison.updatedHash}:${page.namesHash}`}
                rows={comparison.rows}
                blocks={comparison.blocks}
                lang={lang}
              />
              <details>
                <summary>{w.sourceReport}</summary>
                {comparison.sourceReportError && (
                  <p role="status">{w.sourceError}</p>
                )}
                <code>{comparison.sourceReport.join("\n")}</code>
                {comparison.sourceReportError && (
                  <code>{comparison.sourceReportError}</code>
                )}
              </details>
              <button type="button" onClick={download}>
                {w.download}
              </button>
            </section>
          )}
        </>
      )}
      {error && (
        <p className="save-editor-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
function RowView({ row, lang }: { row: Ew9aRow | null; lang: Br4Lang }) {
  const w = event9aWords[lang];
  if (!row) return <p>{w.missing}</p>;
  return (
    <>
      <p>
        {w.index}: {row.index}
      </p>
      {row.keys.map((key, i) => (
        <p key={i}>
          {w.key} {i + 1}: {key}
          <small>{row.hashes[i]}</small>
        </p>
      ))}
      <p>
        {w.value}:{" "}
        {row.value === "True"
          ? w.true
          : row.value === "False"
            ? w.false
            : row.value}
      </p>
      <code>{row.raw}</code>
    </>
  );
}
function Diff({
  rows,
  blocks,
  lang,
}: {
  rows: Ew9aPhysicalDiff[];
  blocks: Ew9aBlockChange[];
  lang: Br4Lang;
}) {
  const w = event9aWords[lang];
  const [offset, setOffset] = useState(0);
  return (
    <>
      <p>
        {w.changes}: {rows.length} · {w.blocks}: {blocks.length}
      </p>
      {!rows.length && !blocks.length && <p>{w.noChanges}</p>}
      {rows.slice(offset, offset + 20).map((r) => (
        <details key={`${r.group}:${r.index}`}>
          <summary>
            {w.groups[r.group as keyof typeof w.groups] ?? r.group} · {r.index}
          </summary>
          <div className="save-event9a-comparison">
            <div>
              <h4>{w.before}</h4>
              <RowView row={r.before} lang={lang} />
            </div>
            <div>
              <h4>{w.after}</h4>
              <RowView row={r.after} lang={lang} />
            </div>
          </div>
        </details>
      ))}
      {rows.length > 20 && (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - 20))}
          >
            {w.previous}
          </button>
          <span>
            {offset + 1}–{Math.min(offset + 20, rows.length)} / {rows.length}
          </span>
          <button
            type="button"
            disabled={offset + 20 >= rows.length}
            onClick={() => setOffset(offset + 20)}
          >
            {w.next}
          </button>
        </div>
      )}
      {blocks.map((b) => (
        <details key={b.key}>
          <summary>
            {w.blocks} {b.key}
          </summary>
          <div className="save-event9a-comparison">
            <div>
              <h4>{w.before}</h4>
              <p>
                {b.beforeType} / {b.beforeSubtype}
              </p>
              <code>{b.before}</code>
            </div>
            <div>
              <h4>{w.after}</h4>
              <p>
                {b.afterType} / {b.afterSubtype}
              </p>
              <code>{b.after}</code>
            </div>
          </div>
        </details>
      ))}
    </>
  );
}
