import { useEffect, useId, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { SaveEditorResult } from "./domain";
import { propertyBatchWords, type PropertyBatchCatalog } from "./propertyBatch";
import {
  FILE_BATCH_LIMITS,
  fileBatchHasErrors,
  fileBatchWords,
  type FileBatchConfirmation,
  type FileBatchTicket,
} from "./fileBatch";

export function FileBatchEditor({
  busy,
  lang,
  onCatalog,
  onPreview,
  onDownload,
  onDiscard,
}: {
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onCatalog(): Promise<SaveEditorResult | undefined>;
  onPreview(files: File[], text: string): Promise<SaveEditorResult | undefined>;
  onDownload(confirmation: FileBatchConfirmation): Promise<boolean>;
  onDiscard(token: string): void;
}) {
  const words = fileBatchWords[lang],
    common = propertyBatchWords[lang],
    listId = useId();
  const [files, setFiles] = useState<File[]>([]),
    [text, setText] = useState("");
  const [catalogs, setCatalogs] = useState<PropertyBatchCatalog[]>([]),
    [format, setFormat] = useState("");
  const [property, setProperty] = useState("IV_HP"),
    [operator, setOperator] = useState("."),
    [value, setValue] = useState("31");
  const [ticket, setTicket] = useState<FileBatchTicket>();
  const [allowErrors, setErrors] = useState(false),
    [allowEmpty, setEmpty] = useState(false),
    [allowIgnored, setIgnored] = useState(false);
  const [page, setPage] = useState(0),
    [detail, setDetail] = useState<number>(),
    [groupPage, setGroupPage] = useState(0),
    [downloaded, setDownloaded] = useState(false);
  const picker = useRef<HTMLInputElement>(null),
    directory = useRef<HTMLInputElement>(null);
  const token = useRef<string | undefined>(undefined),
    mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (token.current) onDiscard(token.current);
    };
  }, [onDiscard]);
  const clear = () => {
    if (token.current) onDiscard(token.current);
    token.current = undefined;
    setTicket(undefined);
    setErrors(false);
    setEmpty(false);
    setIgnored(false);
    setPage(0);
    setDetail(undefined);
    setGroupPage(0);
    setDownloaded(false);
  };
  const preview = async () => {
    clear();
    const response = await onPreview(files, text);
    const next = response?.filePreview;
    if (!next) return;
    if (!mounted.current) {
      onDiscard(next.token);
      return;
    }
    token.current = next.token;
    setTicket(next);
  };
  const summary = ticket?.summary,
    errors = ticket ? fileBatchHasErrors(ticket) : false;
  const selected = detail === undefined ? undefined : summary?.files[detail];
  const state = (name: string) =>
    words.states[name as keyof typeof words.states] ?? name;
  const catalog = catalogs.find((c) => c.format === format);
  return (
    <section
      className="save-property-batch save-file-batch"
      aria-label={words.title}
    >
      <p className="save-editor-note">{words.note}</p>
      <fieldset disabled={busy}>
        <legend>{words.title}</legend>
        <input
          ref={picker}
          hidden
          type="file"
          multiple
          onChange={(e) => {
            clear();
            setFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <input
          ref={(node) => {
            directory.current = node;
            node?.setAttribute("webkitdirectory", "");
          }}
          hidden
          type="file"
          multiple
          onChange={(e) => {
            clear();
            setFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <div className="save-editor-toolbar">
          <button type="button" onClick={() => picker.current?.click()}>
            {words.files}
          </button>
          <button type="button" onClick={() => directory.current?.click()}>
            {words.directory}
          </button>
          <button
            type="button"
            disabled={!files.length}
            onClick={() => {
              clear();
              setFiles([]);
            }}
          >
            {words.clear}
          </button>
          <span role="status">
            {words.selected}: {files.length} ·{" "}
            {(files.reduce((n, f) => n + f.size, 0) / 1048576).toFixed(2)} MiB
          </span>
        </div>
        <button
          type="button"
          onClick={async () => {
            const response = await onCatalog();
            if (!mounted.current) return;
            const next = response?.fileCatalog ?? [];
            setCatalogs(next);
            const extension = files[0]?.name.split(".").at(-1)?.toUpperCase();
            setFormat(
              next.find((c) => c.format === extension)?.format ??
                next[0]?.format ??
                "",
            );
          }}
        >
          {common.load}
        </button>
        <div className="save-editor-fields">
          {catalogs.length > 0 && (
            <label className="field">
              <span>{words.catalogFormat}</span>
              <Select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                {catalogs.map((c) => (
                  <option key={c.format}>{c.format}</option>
                ))}
              </Select>
            </label>
          )}
          <label className="field">
            <span>{common.property}</span>
            <input
              list={listId}
              value={property}
              onChange={(e) => setProperty(e.target.value)}
            />
            <datalist id={listId}>
              {catalog?.fields.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.type}
                </option>
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>{common.operator}</span>
            <Select
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
            >
              {[
                ".",
                "=",
                "!",
                ">",
                "<",
                "≥",
                "≤",
                "+",
                "-",
                "*",
                "/",
                "%",
                "&",
                "|",
                "^",
                "«",
                "»",
              ].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          </label>
          <label className="field">
            <span>{common.value}</span>
            <input value={value} onChange={(e) => setValue(e.target.value)} />
          </label>
        </div>
        <button
          type="button"
          disabled={!property.trim()}
          onClick={() => {
            clear();
            setText(
              (t) => `${t ? t + "\n" : ""}${operator}${property}=${value}`,
            );
          }}
        >
          {common.add}
        </button>
        <label className="field">
          <span>{common.text}</span>
          <textarea
            rows={7}
            maxLength={FILE_BATCH_LIMITS.instructionCharacters}
            value={text}
            onChange={(e) => {
              clear();
              setText(e.target.value);
            }}
          />
        </label>
        <button
          type="button"
          disabled={!files.length || !text.trim()}
          onClick={() => void preview()}
        >
          {common.preview}
        </button>
        {summary && ticket && (
          <>
            <p role="status">
              {common.group}: {summary.groups} · {common.filters}:{" "}
              {summary.filters} · {common.instructions}: {summary.instructions}{" "}
              · {words.exported}: {summary.exportedFiles}
            </p>
            {errors && (
              <label className="save-pokedex-check">
                <input
                  type="checkbox"
                  checked={allowErrors}
                  onChange={(e) => setErrors(e.target.checked)}
                />
                {common.errors}
              </label>
            )}
            {summary.emptyValues && (
              <label className="save-pokedex-check">
                <input
                  type="checkbox"
                  checked={allowEmpty}
                  onChange={(e) => setEmpty(e.target.checked)}
                />
                {common.empty}
              </label>
            )}
            {summary.ignoredLines.length > 0 && (
              <label className="save-pokedex-check">
                <input
                  type="checkbox"
                  checked={allowIgnored}
                  onChange={(e) => setIgnored(e.target.checked)}
                />
                {common.ignored}: {summary.ignoredLines.join(", ")}
              </label>
            )}
            <div className="save-pokedex-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{words.path}</th>
                    <th>{words.format}</th>
                    <th>{common.result}</th>
                    <th>{words.details}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.files
                    .slice(page * 50, page * 50 + 50)
                    .map((f, i) => (
                      <tr key={f.path}>
                        <td className="save-file-path">{f.path}</td>
                        <td>{f.format ?? "—"}</td>
                        <td>
                          {state(f.status)}
                          {f.outcomes.some((o) => o.error)
                            ? ` · ${common.failure}`
                            : ""}
                        </td>
                        <td>
                          <button
                            type="button"
                            disabled={!f.outcomes.length}
                            aria-pressed={detail === page * 50 + i}
                            onClick={() => {
                              setDetail(page * 50 + i);
                              setGroupPage(0);
                            }}
                          >
                            {words.details}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => {
                  setPage((p) => p - 1);
                  setDetail(undefined);
                }}
              >
                {common.previous}
              </button>
              <span>
                {page + 1} / {Math.max(1, Math.ceil(summary.files.length / 50))}
              </span>
              <button
                type="button"
                disabled={(page + 1) * 50 >= summary.files.length}
                onClick={() => {
                  setPage((p) => p + 1);
                  setDetail(undefined);
                }}
              >
                {common.next}
              </button>
            </div>
            {selected && (
              <>
                <p className="save-file-path">{selected.path}</p>
                <div className="save-pokedex-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{common.group}</th>
                        <th>{common.result}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.outcomes
                        .slice(groupPage * 50, groupPage * 50 + 50)
                        .map((o) => (
                          <tr key={o.group}>
                            <td>{o.group + 1}</td>
                            <td>
                              {state(o.result)}
                              {o.error ? ` · ${common.failure}` : ""}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="save-editor-toolbar">
                  <button
                    type="button"
                    disabled={groupPage === 0}
                    onClick={() => setGroupPage((p) => p - 1)}
                  >
                    {common.previous}
                  </button>
                  <span>
                    {groupPage + 1} /{" "}
                    {Math.max(1, Math.ceil(selected.outcomes.length / 50))}
                  </span>
                  <button
                    type="button"
                    disabled={(groupPage + 1) * 50 >= selected.outcomes.length}
                    onClick={() => setGroupPage((p) => p + 1)}
                  >
                    {common.next}
                  </button>
                </div>
              </>
            )}
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={
                  !summary.exportedFiles ||
                  !summary.instructions ||
                  (errors && !allowErrors) ||
                  (summary.emptyValues && !allowEmpty) ||
                  (summary.ignoredLines.length > 0 && !allowIgnored)
                }
                onClick={async () => {
                  const done = await onDownload({
                    token: ticket.token,
                    allowErrors,
                    allowEmpty,
                    allowIgnored,
                  });
                  if (mounted.current && done) setDownloaded(true);
                }}
              >
                {words.download}
              </button>
              <button type="button" onClick={clear}>
                {common.cancel}
              </button>
            </div>
            {downloaded && <p role="status">{words.downloaded}</p>}
          </>
        )}
      </fieldset>
    </section>
  );
}
