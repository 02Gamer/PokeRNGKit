import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { SaveEditorResult, SaveReport } from "./domain";
import {
  boxImportHasSkipped,
  boxImportWords,
  type BoxImportConfirmation,
  type BoxImportOptions,
  type BoxImportTicket,
} from "./boxImport";

export function BoxImportEditor({
  report,
  box,
  busy,
  lang,
  onPreview,
  onApply,
  onDiscard,
}: {
  report: SaveReport;
  box: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onPreview(
    files: File[],
    options: BoxImportOptions,
  ): Promise<SaveEditorResult | undefined>;
  onApply(confirmation: BoxImportConfirmation): Promise<void>;
  onDiscard(token: string): void;
}) {
  const words = boxImportWords[lang];
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<BoxImportOptions>({
    firstBox: Math.max(box, 0),
    clear: false,
    overwrite: false,
    updateToSaveFile: 2,
    updatePokeDex: 2,
    updateRecord: 2,
  });
  const [ticket, setTicket] = useState<BoxImportTicket>();
  const [allowClear, setClear] = useState(false),
    [allowOverwrite, setOverwrite] = useState(false),
    [allowSkipped, setSkipped] = useState(false);
  const [page, setPage] = useState(0);
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
  function clear() {
    if (token.current) onDiscard(token.current);
    token.current = undefined;
    setTicket(undefined);
    setClear(false);
    setOverwrite(false);
    setSkipped(false);
    setPage(0);
  }
  function change(patch: Partial<BoxImportOptions>) {
    clear();
    setOptions({ ...options, ...patch });
  }
  async function preview() {
    clear();
    const result = await onPreview(files, options);
    const next = result?.boxImportPreview;
    if (!next) return;
    if (!mounted.current) {
      onDiscard(next.token);
      return;
    }
    token.current = next.token;
    setTicket(next);
  }
  const summary = ticket?.summary;
  const rows = ticket
    ? [
        ...ticket.files
          .filter((f) => f.status !== "ready")
          .map((f) => ({
            path: f.path,
            member: "",
            position: "—",
            status: f.status,
          })),
        ...ticket.summary.outcomes.map((o) => {
          const source = ticket.sources[o.source];
          return {
            path: source ? (ticket.files[source.file]?.path ?? "—") : "—",
            member: source ? ` / ${source.entry + 1}` : "",
            position: o.box >= 0 ? `${o.box + 1} / ${o.slot + 1}` : "—",
            status: o.status,
          };
        }),
      ]
    : [];
  const skipped = ticket ? boxImportHasSkipped(ticket) : false;
  const pages = Math.max(1, Math.ceil(rows.length / 50));
  const canApply =
    !!summary &&
    (summary.written > 0 || summary.deleted > 0) &&
    (!summary.deleted || allowClear) &&
    (!summary.overwritten || allowOverwrite) &&
    (!skipped || allowSkipped);
  return (
    <details className="save-pokemon-editor save-box-import">
      <summary>{words.title}</summary>
      <p className="save-editor-note">{words.note}</p>
      <fieldset disabled={busy}>
        <input
          hidden
          type="file"
          multiple
          ref={picker}
          onChange={(e) => {
            clear();
            setFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <input
          hidden
          type="file"
          multiple
          ref={(node) => {
            directory.current = node;
            node?.setAttribute("webkitdirectory", "");
          }}
          onChange={(e) => {
            clear();
            setFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <div className="save-editor-toolbar">
          <button type="button" onClick={() => picker.current?.click()}>
            {words.choose}
          </button>
          <button type="button" onClick={() => directory.current?.click()}>
            {words.folder}
          </button>
          <span role="status">
            {words.selected}: {files.length}
          </span>
        </div>
        <p className="save-editor-note">{words.limits}</p>
        <div className="save-editor-fields">
          <label className="field">
            <span>{words.start}</span>
            <Select
              value={options.firstBox}
              onChange={(e) => change({ firstBox: Number(e.target.value) })}
            >
              {Array.from({ length: report.boxCount }, (_, i) => (
                <option value={i} key={i}>
                  {i + 1}. {report.boxes[i]?.name}
                </option>
              ))}
            </Select>
          </label>
          {(["updateToSaveFile", "updatePokeDex", "updateRecord"] as const).map(
            (key, i) => (
              <label className="field" key={key}>
                <span>{words.settings[i]}</span>
                <Select
                  value={options[key]}
                  onChange={(e) => change({ [key]: Number(e.target.value) })}
                >
                  {words.choices.map((label, value) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </label>
            ),
          )}
        </div>
        <label className="save-check">
          <input
            type="checkbox"
            checked={options.clear}
            onChange={(e) => change({ clear: e.target.checked })}
          />
          {words.clear}
        </label>
        <label className="save-check">
          <input
            type="checkbox"
            checked={options.overwrite}
            onChange={(e) => change({ overwrite: e.target.checked })}
          />
          {words.overwrite}
        </label>
        <p className="save-editor-note">{words.protection}</p>
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={!files.length && !options.clear}
            onClick={() => void preview()}
          >
            {words.preview}
          </button>
          {ticket && (
            <button type="button" onClick={clear}>
              {words.cancel}
            </button>
          )}
        </div>
        {ticket && summary && (
          <>
            <p role="status">
              {words.written}: {summary.written} · {words.deleted}:{" "}
              {summary.deleted} · {words.overwritten}: {summary.overwritten}
            </p>
            {rows.length > 0 && (
              <div className="save-import-results">
                <table>
                  <thead>
                    <tr>
                      <th>{words.source}</th>
                      <th>{words.position}</th>
                      <th>{words.result}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(page * 50, (page + 1) * 50).map((row, i) => (
                      <tr key={page * 50 + i}>
                        <td className="save-file-path">
                          {row.path}
                          {row.member}
                        </td>
                        <td>{row.position}</td>
                        <td>
                          {words.states[
                            row.status as keyof typeof words.states
                          ] ?? words.unknown}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {pages > 1 && (
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  {words.previous}
                </button>
                <span>
                  {page + 1} / {pages}
                </span>
                <button
                  type="button"
                  disabled={page + 1 >= pages}
                  onClick={() => setPage(page + 1)}
                >
                  {words.next}
                </button>
              </div>
            )}
            {summary.deleted > 0 && (
              <label className="save-check">
                <input
                  type="checkbox"
                  checked={allowClear}
                  onChange={(e) => setClear(e.target.checked)}
                />
                {words.confirmClear}
              </label>
            )}
            {summary.overwritten > 0 && (
              <label className="save-check">
                <input
                  type="checkbox"
                  checked={allowOverwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                />
                {words.confirmOverwrite}
              </label>
            )}
            {skipped && (
              <label className="save-check">
                <input
                  type="checkbox"
                  checked={allowSkipped}
                  onChange={(e) => setSkipped(e.target.checked)}
                />
                {words.confirmSkipped}
              </label>
            )}
            {!summary.written && !summary.deleted && (
              <p className="save-editor-note">{words.noChanges}</p>
            )}
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={!canApply}
                onClick={() =>
                  void onApply({
                    token: ticket.token,
                    allowClear,
                    allowOverwrite,
                    allowSkipped,
                  })
                }
              >
                {words.apply}
              </button>
            </div>
          </>
        )}
      </fieldset>
    </details>
  );
}
