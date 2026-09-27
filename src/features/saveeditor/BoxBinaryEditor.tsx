import { useEffect, useRef, useState } from "react";
import { Select } from "../shared/Select";
import type { SaveEditorResult } from "./domain";
import { boxImportWords, type BoxImportConfirmation } from "./boxImport";
import {
  boxBinaryWords,
  type BoxBinaryOptions,
  type BoxBinaryTicket,
} from "./boxBinary";

export interface BoxBinaryActions {
  onPreviewBoxBinary(
    file: File,
    options: BoxBinaryOptions,
  ): Promise<SaveEditorResult | undefined>;
  onApplyBoxBinary(confirmation: BoxImportConfirmation): Promise<void>;
  onDiscardBoxBinary(token: string): void;
  onExportBoxBinary(request: { box: number; all: boolean }): Promise<boolean>;
}

export function BoxBinaryEditor({
  box,
  canEdit,
  busy,
  lang,
  onPreviewBoxBinary,
  onApplyBoxBinary,
  onDiscardBoxBinary,
  onExportBoxBinary,
}: BoxBinaryActions & {
  box: number;
  canEdit: boolean;
  busy: boolean;
  lang: "zh" | "en" | "ja";
}) {
  const words = boxBinaryWords[lang],
    common = boxImportWords[lang];
  const [options, setOptions] = useState<BoxBinaryOptions>({
    box,
    all: box < 0,
    updateToSaveFile: 2,
    updatePokeDex: 2,
    updateRecord: 2,
  });
  const [file, setFile] = useState<File>();
  const [ticket, setTicket] = useState<BoxBinaryTicket>();
  const [allowClear, setClear] = useState(false),
    [allowOverwrite, setOverwrite] = useState(false);
  const [page, setPage] = useState(0),
    [downloaded, setDownloaded] = useState(false);
  const picker = useRef<HTMLInputElement>(null),
    token = useRef<string | undefined>(undefined),
    mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (token.current) onDiscardBoxBinary(token.current);
    };
  }, [onDiscardBoxBinary]);
  function clear() {
    if (token.current) onDiscardBoxBinary(token.current);
    token.current = undefined;
    setTicket(undefined);
    setClear(false);
    setOverwrite(false);
    setPage(0);
  }
  function change(patch: Partial<BoxBinaryOptions>) {
    clear();
    setOptions({ ...options, ...patch });
    setDownloaded(false);
  }
  async function preview() {
    if (!file) return;
    clear();
    const next = (await onPreviewBoxBinary(file, options))?.boxBinaryPreview;
    if (!next) return;
    if (!mounted.current) {
      onDiscardBoxBinary(next.token);
      return;
    }
    token.current = next.token;
    setTicket(next);
  }
  const summary = ticket?.summary,
    rows = summary?.outcomes ?? [],
    pages = Math.max(1, Math.ceil(rows.length / 50));
  return (
    <details className="save-pokemon-editor save-box-import">
      <summary>{words.title}</summary>
      <p className="save-editor-note">{words.note}</p>
      <fieldset disabled={busy}>
        <label className="field">
          <span>{words.scope}</span>
          <Select
            value={options.all ? 1 : 0}
            onChange={(e) => change({ all: e.target.value === "1" })}
          >
            {words.scopes.map((label, value) => (
              <option
                key={value}
                value={value}
                disabled={value === 0 && box < 0}
              >
                {label}
              </option>
            ))}
          </Select>
        </label>
        <div className="save-editor-toolbar">
          <button
            type="button"
            onClick={async () => {
              setDownloaded(false);
              const success = await onExportBoxBinary(options);
              if (mounted.current) setDownloaded(success);
            }}
          >
            {words.download}
          </button>
        </div>
        {downloaded && <p role="status">{words.downloaded}</p>}
        {canEdit && (
          <>
            <p className="save-editor-note">{words.limit}</p>
            <input
              hidden
              type="file"
              ref={picker}
              onChange={(e) => {
                clear();
                setFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <div className="save-editor-toolbar">
              <button type="button" onClick={() => picker.current?.click()}>
                {words.choose}
              </button>
            </div>
            {file && (
              <p className="save-file-path">
                {file.name} ({file.size.toLocaleString()} B)
              </p>
            )}
            <div className="save-editor-fields">
              {(
                ["updateToSaveFile", "updatePokeDex", "updateRecord"] as const
              ).map((key, i) => (
                <label className="field" key={key}>
                  <span>{common.settings[i]}</span>
                  <Select
                    value={options[key]}
                    onChange={(e) => change({ [key]: Number(e.target.value) })}
                  >
                    {common.choices.map((label, value) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </label>
              ))}
            </div>
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={!file}
                onClick={() => void preview()}
              >
                {words.preview}
              </button>
              {ticket && (
                <button type="button" onClick={clear}>
                  {common.cancel}
                </button>
              )}
            </div>
            {ticket && summary && (
              <>
                <p role="status">
                  {common.written}: {summary.written} · {common.deleted}:{" "}
                  {summary.deleted} · {common.overwritten}:{" "}
                  {summary.overwritten}
                </p>
                <div className="save-import-results">
                  <table>
                    <thead>
                      <tr>
                        <th>{words.source}</th>
                        <th>{common.position}</th>
                        <th>{common.result}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(page * 50, (page + 1) * 50).map((row, i) => (
                        <tr key={page * 50 + i}>
                          <td>{row.source + 1}</td>
                          <td>
                            {row.box + 1} / {row.slot + 1}
                          </td>
                          <td>
                            {common.states[
                              row.status as keyof typeof common.states
                            ] ?? common.unknown}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pages > 1 && (
                  <div className="save-editor-toolbar">
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      {common.previous}
                    </button>
                    <span>
                      {page + 1} / {pages}
                    </span>
                    <button
                      type="button"
                      disabled={page + 1 >= pages}
                      onClick={() => setPage(page + 1)}
                    >
                      {common.next}
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
                    {common.confirmClear}
                  </label>
                )}
                {summary.overwritten > 0 && (
                  <label className="save-check">
                    <input
                      type="checkbox"
                      checked={allowOverwrite}
                      onChange={(e) => setOverwrite(e.target.checked)}
                    />
                    {common.confirmOverwrite}
                  </label>
                )}
                <div className="save-editor-toolbar">
                  <button
                    type="button"
                    disabled={
                      (!allowClear && summary.deleted > 0) ||
                      (!allowOverwrite && summary.overwritten > 0)
                    }
                    onClick={() =>
                      void onApplyBoxBinary({
                        token: ticket.token,
                        allowClear,
                        allowOverwrite,
                        allowSkipped: false,
                      })
                    }
                  >
                    {common.apply}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </fieldset>
    </details>
  );
}
