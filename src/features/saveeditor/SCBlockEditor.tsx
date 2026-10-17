// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import {
  scblockConfirmation,
  scblockRequest,
  scblockTopLevelFiles,
  type SCBlockAction,
  type SCBlockComparison,
  type SCBlockConfirmation,
  type SCBlockExportResult,
  type SCBlockPage,
  type SCBlockQuery,
  type SCBlockTicket,
} from "./scblock";
import { scblockWords } from "./scblockWords";
import "./SCBlockEditor.css";
import { blockKeyDefaults, blockKeyWords } from "./blockKeyDefaults";
import { readSaveSettings } from "./settingsRepository";
type Props = {
  format: string;
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(query: SCBlockQuery): Promise<SCBlockPage | undefined>;
  onExport(query: {
    kind: "block" | "folder" | "single";
    key?: string;
    options?: number;
  }): Promise<SCBlockExportResult | undefined>;
  onCompare(
    updated: string,
    names: string,
  ): Promise<SCBlockComparison | undefined>;
  onPreview(
    request: ReturnType<typeof scblockRequest>,
  ): Promise<SCBlockTicket | undefined>;
  onApply(confirmation: SCBlockConfirmation): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
};
const hex = (data: string) =>
  Array.from(atob(data), (c) =>
    c.charCodeAt(0).toString(16).padStart(2, "0").toUpperCase(),
  ).join(" ");
async function fileData(file: File) {
  if (file.size > 32 * 1024 * 1024) throw new Error("File too large");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192)
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
export function SCBlockEditor(props: Props) {
  return <Form key={`${props.revision}:${props.format}`} {...props} />;
}
function Form({
  format,
  busy,
  lang,
  onRead,
  onExport,
  onCompare,
  onPreview,
  onApply,
  onDiscard,
}: Props) {
  const w = scblockWords[lang];
  const [page, setPage] = useState<SCBlockPage>();
  const [ticket, setTicket] = useState<SCBlockTicket>();
  const [comparison, setComparison] = useState<SCBlockComparison>();
  const [names, setNames] = useState(""),
    [exclusions, setExclusions] = useState(""),
    [filter, setFilter] = useState("");
  const [mode, setMode] = useState<"blocks" | "export" | "names" | "compare">(
    "blocks",
  );
  const [directory, setDirectory] = useState(false);
  const [resourceFailed, setResourceFailed] = useState(false);
  const defaultExclusions = useRef<string[]>([]);
  const [importPage, setImportPage] = useState(0);
  const [options, setOptions] = useState(9),
    [accepted, setAccepted] = useState(false),
    [pending, setPending] = useState(true),
    [error, setError] = useState(false);
  const flight = useRef(false);
  const initial = useRef<
    | Promise<{
        result: SCBlockPage | undefined;
        defaults: Awaited<ReturnType<typeof blockKeyDefaults>>;
      }>
    | undefined
  >(undefined);
  const life = useRef({
    alive: true,
    epoch: 0,
    ticket: undefined as SCBlockTicket | undefined,
    onRead,
    onDiscard,
  });
  const urls = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    life.current.onRead = onRead;
    life.current.onDiscard = onDiscard;
  }, [onRead, onDiscard]);
  useEffect(() => {
    const state = life.current;
    state.alive = true;
    const epoch = ++state.epoch;
    initial.current ??= Promise.resolve()
      .then(() =>
        blockKeyDefaults(format, false, readSaveSettings()?.json ?? ""),
      )
      .then(async (defaults) => {
        const result = await state.onRead({
          names: defaults.names,
          exclusions: defaults.exclusions,
          filter: "",
          offset: 0,
          limit: 50,
        });
        return { result, defaults };
      });
    void initial.current
      .then(({ result, defaults }) => {
        if (state.alive && epoch === state.epoch) {
          setPage(result);
          setNames(defaults.names);
          setExclusions(defaults.exclusions.join("\n"));
          defaultExclusions.current = defaults.exclusions;
          setResourceFailed(defaults.failed);
        }
      })
      .catch(() => {
        if (state.alive && epoch === state.epoch) setError(true);
      })
      .finally(() => {
        if (state.alive && epoch === state.epoch) setPending(false);
      });
    const downloads = urls.current;
    return () => {
      state.alive = false;
      state.epoch++;
      if (state.ticket) void state.onDiscard(state.ticket.token);
      for (const [url, timer] of downloads) {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      }
      downloads.clear();
    };
  }, [format]);
  const locked = busy || pending;
  const editing = !!page?.canEdit && !ticket;
  async function perform(task: (epoch: number) => Promise<void>) {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    setError(false);
    const epoch = life.current.epoch;
    try {
      await task(epoch);
    } catch {
      if (life.current.alive && epoch === life.current.epoch) setError(true);
    } finally {
      flight.current = false;
      if (life.current.alive && epoch === life.current.epoch) setPending(false);
    }
  }
  const active = (epoch: number) =>
    life.current.alive && epoch === life.current.epoch;
  async function read(offset = 0, selected?: string, search = filter) {
    if (ticket) return;
    await perform(async (epoch) => {
      const result = await onRead({
        names,
        exclusions:
          exclusions === defaultExclusions.current.join("\n")
            ? defaultExclusions.current
            : exclusions.split(/\r?\n/).filter(Boolean),
        filter: search,
        offset,
        limit: 50,
        selected,
      });
      if (active(epoch) && result) setPage(result);
    });
  }
  async function preview(actions: SCBlockAction[]) {
    if (!page || !editing) return;
    const epoch = life.current.epoch;
    const result = await onPreview(scblockRequest(page, actions));
    if (!active(epoch)) {
      if (result) await onDiscard(result.token);
      return;
    }
    if (result) {
      if (result.sourceHash !== page.sourceHash) {
        await onDiscard(result.token);
        throw new Error("Stale preview");
      }
      life.current.ticket = result;
      setTicket(result);
      setImportPage(0);
      setAccepted(false);
    }
  }
  function download(result: SCBlockExportResult) {
    for (const file of result.files) {
      const raw = atob(file.data),
        bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/octet-stream" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = file.fileName;
      a.click();
      urls.current.set(
        url,
        setTimeout(() => {
          URL.revokeObjectURL(url);
          urls.current.delete(url);
        }, 30000),
      );
    }
  }
  const selected = page?.selected;
  return (
    <section
      className="save-scblock-editor"
      aria-label={w.title}
      aria-busy={locked}
    >
      <h3>{w.title}</h3>
      {resourceFailed && (
        <p className="save-editor-note" role="status">
          {blockKeyWords[lang].failed}
        </p>
      )}
      {error && (
        <p className="save-editor-error" role="alert">
          {w.error}
        </p>
      )}
      {pending && <p role="status">{w.pending}</p>}
      <div className="save-editor-toolbar" role="group" aria-label={w.title}>
        {(["blocks", "export", "names", "compare"] as const).map((m) => (
          <button
            type="button"
            key={m}
            disabled={locked}
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
          >
            {m === "blocks"
              ? w.read
              : m === "export"
                ? w.export
                : m === "names"
                  ? w.names
                  : w.compare}
          </button>
        ))}
      </div>
      {mode === "blocks" && (
        <>
          <div className="save-editor-toolbar">
            <label className="field">
              <span>{w.filter}</span>
              <input
                value={filter}
                maxLength={32767}
                disabled={locked || !!ticket}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const key = filter.trim();
                    if (/^[\da-fA-F]{8}$/.test(key) && key !== "00000000") {
                      setFilter("");
                      void read(0, key.toUpperCase(), "");
                    } else void read();
                  }
                }}
              />
            </label>
            <button
              type="button"
              disabled={locked || !!ticket}
              onClick={() => void read()}
            >
              {w.read}
            </button>
          </div>
          <div className="save-scblock-workspace">
            <div className="save-scblock-list">
              <table>
                <thead>
                  <tr>
                    <th>{w.key}</th>
                    <th>{w.type}</th>
                    <th>{w.bytes}</th>
                  </tr>
                </thead>
                <tbody>
                  {page?.blocks.map((b) => (
                    <tr key={b.key} aria-selected={selected?.key === b.key}>
                      <td>
                        <button
                          type="button"
                          disabled={locked || !!ticket}
                          onClick={() => void read(page.offset, b.key)}
                        >
                          {b.name ?? b.key}
                        </button>
                        <small>{b.key}</small>
                      </td>
                      <td>{b.type}</td>
                      <td>{b.bytes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="save-scblock-detail">
              {selected && (
                <>
                  <h4>{selected.name ?? selected.key}</h4>
                  <dl>
                    <dt>{w.key}</dt>
                    <dd>{selected.key}</dd>
                    <dt>{w.type}</dt>
                    <dd>{selected.type}</dd>
                    <dt>{w.subtype}</dt>
                    <dd>{selected.subType}</dd>
                    <dt>{w.bytes}</dt>
                    <dd>{selected.bytes}</dd>
                    {selected.value !== null && (
                      <>
                        <dt>{w.value}</dt>
                        <dd>{selected.value}</dd>
                      </>
                    )}
                  </dl>
                  {selected.canToggle && (
                    <label className="field">
                      <span>{w.type}</span>
                      <Select
                        value={selected.type}
                        disabled={locked || !editing}
                        onChange={(e) =>
                          void perform(async () =>
                            preview([
                              {
                                kind: "toggle",
                                key: selected.key,
                                type: e.target.value as "Bool1" | "Bool2",
                              },
                            ]),
                          )
                        }
                      >
                        <option>Bool1</option>
                        <option>Bool2</option>
                      </Select>
                    </label>
                  )}
                  <RawBytes
                    key={selected.key}
                    data={page?.data ?? ""}
                    lang={lang}
                  />
                  <div className="save-editor-toolbar">
                    <label
                      className="save-editor-file"
                      aria-disabled={locked || !editing}
                    >
                      {w.import}
                      <input
                        type="file"
                        disabled={locked || !editing}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file)
                            void perform(async (epoch) => {
                              const data = await fileData(file);
                              if (active(epoch))
                                await preview([
                                  { kind: "import", key: selected.key, data },
                                ]);
                            });
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() =>
                        void perform(async (epoch) => {
                          const result = await onExport({
                            kind: "block",
                            key: selected.key,
                          });
                          if (active(epoch) && result) download(result);
                        })
                      }
                    >
                      {w.export}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked || !!ticket || !page || page.offset === 0}
              onClick={() => void read(Math.max(0, (page?.offset ?? 0) - 50))}
            >
              {w.previous}
            </button>
            <span>
              {page
                ? `${page.offset + 1}–${Math.min(page.offset + 50, page.total)} / ${page.total}`
                : "0"}
            </span>
            <button
              type="button"
              disabled={
                locked || !!ticket || !page || page.offset + 50 >= page.total
              }
              onClick={() => void read((page?.offset ?? 0) + 50)}
            >
              {w.next}
            </button>
          </div>
          <label>
            <input
              type="checkbox"
              checked={directory}
              disabled={locked || !editing}
              onChange={(e) => setDirectory(e.target.checked)}
            />{" "}
            {w.directory}
          </label>
          <label
            className="save-editor-file"
            aria-disabled={locked || !editing}
          >
            {w.folder}
            <input
              {...(directory ? { webkitdirectory: "" } : {})}
              type="file"
              multiple
              disabled={locked || !editing}
              onChange={(e) => {
                const files = scblockTopLevelFiles(
                  Array.from(e.target.files ?? []),
                );
                e.target.value = "";
                if (files.length)
                  void perform(async (epoch) => {
                    const imported = [];
                    let total = 0;
                    for (const file of files) {
                      total += file.size;
                      if (total > 32 * 1024 * 1024 || files.length > 50000)
                        throw new Error("Folder too large");
                      imported.push({
                        fileName: file.name,
                        data: await fileData(file),
                      });
                    }
                    if (active(epoch))
                      await preview([{ kind: "folder", files: imported }]);
                  });
              }}
            />
          </label>
        </>
      )}
      {mode === "names" && (
        <>
          <p className="save-editor-note">{w.help}</p>
          <label
            className="save-editor-file"
            aria-disabled={locked || !!ticket}
          >
            {w.names}
            <input
              type="file"
              accept=".txt,text/plain"
              disabled={locked || !!ticket}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file)
                  void perform(async (epoch) => {
                    if (file.size > 4 * 1024 * 1024)
                      throw new Error("Name table too large");
                    const text = await file.text();
                    if (active(epoch)) setNames(text);
                  });
              }}
            />
          </label>
          <label className="field">
            <span>{w.names}</span>
            <textarea
              value={names}
              maxLength={4 * 1024 * 1024}
              disabled={locked || !!ticket}
              onChange={(e) => setNames(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{w.exclusions}</span>
            <textarea
              value={exclusions}
              disabled={locked || !!ticket}
              onChange={(e) => setExclusions(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={locked || !!ticket}
            onClick={() => void read()}
          >
            {w.read}
          </button>
        </>
      )}
      {mode === "export" && (
        <>
          <div className="save-editor-toolbar">
            {(
              [
                [1, w.dataOnly],
                [2, w.includeKey],
                [4, w.typeInfo],
                [8, w.fakeHeader],
              ] as const
            ).map(([bit, label]) => (
              <label key={bit}>
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={!!(options & bit)}
                  onChange={(e) =>
                    setOptions(
                      e.target.checked ? options | bit : options & ~bit,
                    )
                  }
                />{" "}
                {label}
              </label>
            ))}
          </div>
          <div className="save-editor-toolbar">
            {(["single", "folder"] as const).map((kind) => (
              <button
                type="button"
                key={kind}
                disabled={locked}
                onClick={() =>
                  void perform(async (epoch) => {
                    const result = await onExport({ kind, options });
                    if (active(epoch) && result) download(result);
                  })
                }
              >
                {kind === "single" ? w.exportSingle : w.exportFolder}
              </button>
            ))}
          </div>
        </>
      )}
      {mode === "compare" && (
        <>
          <label className="save-editor-file" aria-disabled={locked}>
            {w.compare}
            <input
              type="file"
              disabled={locked}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file)
                  void perform(async (epoch) => {
                    const data = await fileData(file);
                    if (!active(epoch)) return;
                    const result = await onCompare(data, names);
                    if (active(epoch)) setComparison(result);
                  });
              }}
            />
          </label>
          {comparison && (
            <>
              <h4>{w.sourceReport}</h4>
              {comparison.sourceReportError && (
                <p className="save-editor-note">{w.sourceError}</p>
              )}
              <pre>{comparison.sourceReport.join("\n")}</pre>
              <h4>{w.complete}</h4>
              <Differences blocks={comparison.blocks} lang={lang} />
            </>
          )}
        </>
      )}
      {ticket && (
        <>
          <h4>{w.preview}</h4>
          <p>
            {w.count}: {ticket.blocks.length} · {w.bytes}: {ticket.changedBytes}
          </p>
          <Differences blocks={ticket.blocks} lang={lang} />
          <div className="save-scblock-list">
            <table>
              <thead>
                <tr>
                  <th>{w.key}</th>
                  <th>{w.folder}</th>
                  <th>{w.preview}</th>
                </tr>
              </thead>
              <tbody>
                {ticket.imports
                  .slice(importPage * 50, importPage * 50 + 50)
                  .map((entry, i) => (
                    <tr key={i}>
                      <td>{entry.key}</td>
                      <td>{entry.fileName}</td>
                      <td>{entry.imported ? w.imported : w.failed}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {ticket.imports.length > 50 && (
            <PageControls
              page={importPage}
              total={ticket.imports.length}
              setPage={setImportPage}
              lang={lang}
            />
          )}
          {ticket.requiresPartialAcceptance && (
            <label className="save-editor-review">
              <input
                type="checkbox"
                checked={accepted}
                disabled={locked}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              {w.partial}
            </label>
          )}
          <div className="save-editor-toolbar">
            <button
              type="button"
              className="primary"
              disabled={
                locked || (ticket.requiresPartialAcceptance && !accepted)
              }
              onClick={() =>
                void perform(async () => {
                  if (page)
                    await onApply(scblockConfirmation(page, ticket, accepted));
                })
              }
            >
              {w.apply}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() =>
                void perform(async (epoch) => {
                  await onDiscard(ticket.token);
                  if (active(epoch)) {
                    life.current.ticket = undefined;
                    setTicket(undefined);
                  }
                })
              }
            >
              {w.discard}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
function Differences({
  blocks,
  lang,
}: {
  blocks: SCBlockTicket["blocks"];
  lang: "zh" | "en" | "ja";
}) {
  const w = scblockWords[lang];
  const [page, setPage] = useState(0);
  const current = Math.min(
    page,
    Math.max(0, Math.ceil(blocks.length / 50) - 1),
  );
  return (
    <div className="save-scblock-list">
      {blocks.slice(current * 50, current * 50 + 50).map((b) => (
        <details key={b.key}>
          <summary>
            {b.key} · {b.beforeType ?? "∅"} → {b.afterType ?? "∅"}
          </summary>
          <div className="save-scblock-differences">
            <div>
              <strong>{w.before}</strong>
              <p>{b.beforeSubType}</p>
              {b.beforeData === null ? (
                "∅"
              ) : (
                <RawBytes data={b.beforeData} lang={lang} />
              )}
            </div>
            <div>
              <strong>{w.after}</strong>
              <p>{b.afterSubType}</p>
              {b.afterData === null ? (
                "∅"
              ) : (
                <RawBytes data={b.afterData} lang={lang} />
              )}
            </div>
          </div>
        </details>
      ))}
      {blocks.length > 50 && (
        <PageControls
          page={current}
          total={blocks.length}
          setPage={setPage}
          lang={lang}
        />
      )}
    </div>
  );
}
function PageControls({
  page,
  total,
  setPage,
  lang,
}: {
  page: number;
  total: number;
  setPage(page: number): void;
  lang: "zh" | "en" | "ja";
}) {
  const w = scblockWords[lang];
  return (
    <div className="save-editor-toolbar">
      <button
        type="button"
        disabled={page === 0}
        onClick={() => setPage(page - 1)}
      >
        {w.previous}
      </button>
      <span>
        {page * 50 + 1}–{Math.min(page * 50 + 50, total)} / {total}
      </span>
      <button
        type="button"
        disabled={(page + 1) * 50 >= total}
        onClick={() => setPage(page + 1)}
      >
        {w.next}
      </button>
    </div>
  );
}
function RawBytes({ data, lang }: { data: string; lang: "zh" | "en" | "ja" }) {
  const [offset, setOffset] = useState(0);
  const w = scblockWords[lang];
  const length = Math.max(
    0,
    (data.length / 4) * 3 -
      (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0),
  );
  const start = Math.min(
    offset,
    Math.max(0, Math.ceil(length / 3072) - 1) * 3072,
  );
  const text = hex(data.slice((start / 3) * 4, ((start + 3072) / 3) * 4));
  return (
    <div className="save-scblock-detail">
      <label className="field">
        <span>{w.raw}</span>
        <textarea readOnly value={text} />
      </label>
      <div className="save-editor-toolbar">
        <button
          type="button"
          disabled={start === 0}
          onClick={() => setOffset(Math.max(0, start - 3072))}
        >
          {w.previous}
        </button>
        <span>
          {start}–{Math.min(start + 3072, length)} / {length}
        </span>
        <button
          type="button"
          disabled={start + 3072 >= length}
          onClick={() => setOffset(start + 3072)}
        >
          {w.next}
        </button>
      </div>
    </div>
  );
}
