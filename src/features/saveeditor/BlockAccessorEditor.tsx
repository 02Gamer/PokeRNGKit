// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import {
  accessorConfirmation,
  accessorRequest,
  type AccessorCatalog,
  type AccessorChange,
  type AccessorConfirmation,
  type AccessorProperty,
  type AccessorRequest,
  type AccessorTicket,
} from "./blockAccessor";
import { accessorWords } from "./blockAccessorWords";
import "./BlockAccessorEditor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(selected?: string): Promise<AccessorCatalog | undefined>;
  onPreview(request: AccessorRequest): Promise<AccessorTicket | undefined>;
  onApply(confirmation: AccessorConfirmation): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
};
export function BlockAccessorEditor(props: Props) {
  return <Form key={`${props.revision}:${props.lang}`} {...props} />;
}
function Form({ busy, lang, onRead, onPreview, onApply, onDiscard }: Props) {
  const w = accessorWords[lang];
  const [catalog, setCatalog] = useState<AccessorCatalog>();
  const [changes, setChanges] = useState<AccessorChange[]>([]);
  const [ticket, setTicket] = useState<AccessorTicket>();
  const [path, setPath] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const flight = useRef(false);
  const initialRead = useRef<Promise<AccessorCatalog | undefined> | undefined>(
    undefined,
  );
  const life = useRef({
    alive: true,
    epoch: 0,
    ticket: undefined as AccessorTicket | undefined,
    onRead,
    onDiscard,
  });
  useEffect(() => {
    life.current.onRead = onRead;
    life.current.onDiscard = onDiscard;
  }, [onRead, onDiscard]);
  useEffect(() => {
    const state = life.current;
    state.alive = true;
    const epoch = ++state.epoch;
    initialRead.current ??= state.onRead();
    void initialRead.current
      .then((result) => {
        if (state.alive && state.epoch === epoch) setCatalog(result);
      })
      .catch(() => {
        if (state.alive && state.epoch === epoch) setError(w.error);
      });
    return () => {
      state.alive = false;
      state.epoch++;
      if (state.ticket) void state.onDiscard(state.ticket.token);
    };
  }, [w.error]);
  const locked = busy || pending;
  async function read(selected?: string) {
    if (locked || flight.current || ticket) return;
    flight.current = true;
    setPending(true);
    setError("");
    const state = life.current,
      epoch = state.epoch;
    try {
      const result = await onRead(selected);
      if (state.alive && state.epoch === epoch && result) {
        setCatalog(result);
        setPath([]);
        setPage(0);
        setQuery("");
      }
    } catch {
      if (state.alive) setError(w.error);
    } finally {
      flight.current = false;
      if (state.alive) setPending(false);
    }
  }
  async function preview() {
    if (!catalog || !changes.length || locked || flight.current) return;
    flight.current = true;
    setPending(true);
    setError("");
    const state = life.current,
      epoch = state.epoch;
    try {
      const result = await onPreview(accessorRequest(catalog, changes));
      if (!state.alive || state.epoch !== epoch) {
        if (result) await onDiscard(result.token);
        return;
      }
      if (result) {
        try {
          accessorConfirmation(catalog, result);
        } catch (error) {
          await onDiscard(result.token);
          throw error;
        }
        state.ticket = result;
        setTicket(result);
      }
    } catch {
      if (state.alive) setError(w.error);
    } finally {
      flight.current = false;
      if (state.alive) setPending(false);
    }
  }
  async function cancel() {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    try {
      if (life.current.ticket) await onDiscard(life.current.ticket.token);
      if (life.current.alive) {
        life.current.ticket = undefined;
        setTicket(undefined);
      }
    } catch {
      if (life.current.alive) setError(w.error);
    } finally {
      flight.current = false;
      if (life.current.alive) setPending(false);
    }
  }
  async function apply() {
    if (!ticket || !catalog || locked || flight.current) return;
    flight.current = true;
    setPending(true);
    try {
      if (await onApply(accessorConfirmation(catalog, ticket))) {
        life.current.ticket = undefined;
        if (life.current.alive) {
          setTicket(undefined);
          setChanges([]);
        }
      }
    } catch {
      if (life.current.alive) setError(w.error);
    } finally {
      flight.current = false;
      if (life.current.alive) setPending(false);
    }
  }
  const frame =
    ticket?.results.find((r) => r.block === catalog?.selected)?.result ??
    catalog;
  let rows = frame?.properties ?? [];
  for (let i = 0; i < path.length; i++)
    rows = rows.find((p) => p.path[i] === path[i])?.children ?? [];
  const filtered = rows.filter((p) =>
    `${p.path.at(-1)} ${p.type}`.toLowerCase().includes(query.toLowerCase()),
  );
  const lastPage = Math.max(0, Math.ceil(filtered.length / 40) - 1),
    currentPage = Math.min(page, lastPage);
  function navigate(next: string[]) {
    setPath(next);
    setPage(0);
    setQuery("");
  }
  function add(
    property: AccessorProperty,
    value: string,
    kind: "text" | "json",
  ) {
    if (!catalog || locked || ticket) return;
    setChanges((previous) => [
      ...previous,
      { block: catalog.selected, path: [...property.path], value, kind },
    ]);
  }
  return (
    <section
      className="save-accessor-editor"
      aria-label={w.title}
      aria-busy={locked}
    >
      <h3>{w.title}</h3>
      {error && (
        <p className="save-editor-error" role="alert">
          {error}
        </p>
      )}
      {!catalog ? (
        <div className="save-editor-toolbar">
          <p role="status">{w.loading}</p>
          <button type="button" disabled={locked} onClick={() => void read()}>
            {w.retry}
          </button>
        </div>
      ) : (
        <>
          <label className="field">
            <span>{w.block}</span>
            <Select
              value={catalog.selected}
              disabled={locked || !!ticket}
              onChange={(e) => void read(e.target.value)}
            >
              {catalog.blocks.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.key}
                </option>
              ))}
            </Select>
          </label>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={!path.length}
              onClick={() => navigate([])}
            >
              {w.root}
            </button>
            {path.map((part, index) => (
              <button
                key={index}
                type="button"
                onClick={() => navigate(path.slice(0, index + 1))}
              >
                {part}
              </button>
            ))}
          </div>
          <label className="field">
            <span>{w.search}</span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <div className="save-accessor-properties">
            {filtered
              .slice(currentPage * 40, currentPage * 40 + 40)
              .map((p) => (
                <Property
                  key={JSON.stringify([frame?.selected, p.path, !!ticket])}
                  property={p}
                  lang={lang}
                  locked={locked || !!ticket || changes.length >= 512}
                  onOpen={() => navigate(p.path)}
                  onAdd={(value, kind) => add(p, value, kind)}
                />
              ))}
            {!filtered.length && <p>{w.empty}</p>}
          </div>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              {w.previous}
            </button>
            <output>
              {currentPage + 1} / {lastPage + 1}
            </output>
            <button
              type="button"
              disabled={currentPage === lastPage}
              onClick={() => setPage(currentPage + 1)}
            >
              {w.next}
            </button>
          </div>
          <section className="save-accessor-draft" aria-label={w.changes}>
            <h3>
              {w.changes} ({changes.length})
            </h3>
            <ol>
              {changes.map((c, index) => (
                <li key={index}>
                  <strong>
                    {c.block} / {c.path.join(" / ")}
                  </strong>
                  <pre>{c.value}</pre>
                  <div className="save-editor-toolbar">
                    <button
                      type="button"
                      disabled={locked || !!ticket}
                      onClick={() =>
                        setChanges((previous) =>
                          previous.filter((_, i) => i !== index),
                        )
                      }
                    >
                      {w.remove}
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          {ticket && (
            <>
              <p role="status">
                {w.frozen} {w.changed}: {ticket.changedOffsets.length}
              </p>
              <section className="save-accessor-draft">
                <ol>
                  {changes.map((c, i) => {
                    const result = ticket.results.find(
                      (r) => r.block === c.block,
                    );
                    const find = (catalog?: AccessorCatalog) => {
                      let nodes = catalog?.properties ?? [];
                      let node: AccessorProperty | undefined;
                      for (const part of c.path) {
                        node = nodes.find((p) => p.path.at(-1) === part);
                        nodes = node?.children ?? [];
                      }
                      return node;
                    };
                    return (
                      <li key={i}>
                        <strong>
                          {c.block} / {c.path.join(" / ")}
                        </strong>
                        <pre>
                          {w.before}:{" "}
                          {find(result?.before)?.structuredJson ??
                            find(result?.before)?.value ??
                            w.unavailable}
                        </pre>
                        <pre>
                          {w.after}:{" "}
                          {find(result?.result)?.structuredJson ??
                            find(result?.result)?.value ??
                            w.unavailable}
                        </pre>
                      </li>
                    );
                  })}
                </ol>
                {ticket.blocks.map((b) => (
                  <details key={b.key}>
                    <summary>
                      {b.key} ({b.offsets.length})
                    </summary>
                    <pre>
                      {w.before}: {b.beforeHex}
                    </pre>
                    <pre>
                      {w.after}: {b.afterHex}
                    </pre>
                  </details>
                ))}
              </section>
            </>
          )}
          <div className="save-editor-toolbar">
            {ticket ? (
              <>
                <button
                  className="primary"
                  type="button"
                  disabled={locked}
                  onClick={() => void apply()}
                >
                  {w.apply}
                </button>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => void cancel()}
                >
                  {w.cancel}
                </button>
              </>
            ) : (
              <>
                <button
                  className="primary"
                  type="button"
                  disabled={locked || !changes.length}
                  onClick={() => void preview()}
                >
                  {w.preview}
                </button>
                <button
                  type="button"
                  disabled={locked || !changes.length}
                  onClick={() => setChanges([])}
                >
                  {w.clear}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
function Property({
  property: p,
  lang,
  locked,
  onOpen,
  onAdd,
}: {
  property: AccessorProperty;
  lang: Props["lang"];
  locked: boolean;
  onOpen(): void;
  onAdd(value: string, kind: "text" | "json"): void;
}) {
  const w = accessorWords[lang];
  const [value, setValue] = useState(
    p.canConvertText ? (p.value ?? "") : (p.structuredJson ?? ""),
  );
  const [kind, setKind] = useState<"text" | "json">(
    p.canConvertText ? "text" : "json",
  );
  const editable = !p.readOnly && !p.error;
  return (
    <div className="save-accessor-property">
      <div>
        <strong>{p.path.at(-1)}</strong>
        <p className="save-editor-note">
          {w.type}: {p.type}
        </p>
        {p.readOnly && <p className="save-editor-note">{w.readOnly}</p>}
        {p.children.length > 0 && (
          <div className="save-editor-toolbar">
            <button type="button" onClick={onOpen}>
              {w.open} ({p.children.length})
            </button>
          </div>
        )}
      </div>
      <div>
        {editable ? (
          <>
            <label className="field">
              <span>{w.value}</span>
              {kind === "json" ? (
                <textarea
                  value={value}
                  maxLength={4 * 1024 * 1024}
                  disabled={locked}
                  onChange={(e) => setValue(e.target.value)}
                />
              ) : p.kind === "boolean" ? (
                <Select
                  value={value}
                  disabled={locked}
                  onChange={(e) => setValue(e.target.value)}
                >
                  {(p.choices.length ? p.choices : ["True", "False"]).map(
                    (choice) => (
                      <option key={choice} value={choice}>
                        {choice}
                      </option>
                    ),
                  )}
                </Select>
              ) : (
                <input
                  value={value}
                  maxLength={4 * 1024 * 1024}
                  disabled={locked}
                  onChange={(e) => setValue(e.target.value)}
                />
              )}
            </label>
            {p.kind !== "boolean" &&
              (p.kind === "array" || p.kind === "object") && (
                <label className="field">
                  <span>{w.type}</span>
                  <Select
                    value={kind}
                    disabled={locked}
                    onChange={(e) => {
                      setKind(e.target.value as "text" | "json");
                      setValue(
                        e.target.value === "json"
                          ? (p.structuredJson ?? "")
                          : (p.value ?? ""),
                      );
                    }}
                  >
                    {p.canConvertText && <option value="text">{w.text}</option>}
                    <option value="json">{w.json}</option>
                  </Select>
                </label>
              )}
            {p.choices.length > 0 && p.kind !== "boolean" && (
              <label className="field">
                <span>{w.text}</span>
                <Select
                  value=""
                  disabled={locked}
                  onChange={(e) => setValue(e.target.value)}
                >
                  <option value="">{w.value}</option>
                  {p.choices.map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            {kind === "json" && (
              <p className="save-editor-note">{w.structured}</p>
            )}
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={locked}
                onClick={() => onAdd(value, kind)}
              >
                {w.add}
              </button>
            </div>
          </>
        ) : (
          <output>
            {p.error ? `${w.unavailable}: ${p.error}` : (p.value ?? "")}
          </output>
        )}
      </div>
    </div>
  );
}
