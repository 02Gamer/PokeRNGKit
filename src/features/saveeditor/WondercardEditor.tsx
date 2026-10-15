// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from "react";
import { playSaveSound } from "./saveSound";
import { Select } from "../shared/Select";
import { WondercardImage } from "./WondercardImage";
import {
  wondercardConfirmation,
  wondercardRequest,
  type WondercardAction,
  type WondercardCatalog,
  type WondercardConfirmation,
  type WondercardEntry,
  type WondercardRequest,
  type WondercardTicket,
} from "./wondercard";
import { wondercardWords } from "./wondercardWords";
import { encodeQRImage, decodeQRImage } from "./qrImages";
import "./WondercardEditor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<WondercardCatalog | undefined>;
  onInspect(
    data: string,
    fileName: string,
    qr: boolean,
  ): Promise<WondercardEntry | undefined>;
  onQR(index: number, entry?: WondercardEntry): Promise<string | undefined>;
  onPreview(request: WondercardRequest): Promise<WondercardTicket | undefined>;
  onApply(confirmation: WondercardConfirmation): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
};
export function WondercardEditor(props: Props) {
  return <Form key={props.revision} {...props} />;
}
function Form({
  busy,
  lang,
  onRead,
  onInspect,
  onQR,
  onPreview,
  onApply,
  onDiscard,
}: Props) {
  const w = wondercardWords[lang];
  const [catalog, setCatalog] = useState<WondercardCatalog>();
  const [ticket, setTicket] = useState<WondercardTicket>();
  const [actions, setActions] = useState<WondercardAction[]>([]);
  const [selected, setSelected] = useState(0),
    [destination, setDestination] = useState(0),
    [received, setReceived] = useState("1"),
    [qrText, setQrText] = useState("");
  const [imported, setImported] = useState<{
    entry: WondercardEntry;
    data: string;
    fileName: string;
    qr: boolean;
  }>();
  const [qrImage, setQrImage] = useState("");
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [accept, setAccept] = useState(false);
  const flight = useRef(false),
    initialRead = useRef<Promise<WondercardCatalog | undefined> | undefined>(
      undefined,
    );
  const life = useRef({
    alive: true,
    epoch: 0,
    ticket: undefined as WondercardTicket | undefined,
    onRead,
    onDiscard,
    lang,
    qrAbort: new AbortController(),
    downloads: new Map<string, ReturnType<typeof setTimeout>>(),
  });
  useEffect(() => {
    life.current.onRead = onRead;
    life.current.onDiscard = onDiscard;
    life.current.lang = lang;
  }, [onRead, onDiscard, lang]);
  useEffect(() => {
    const state = life.current;
    state.alive = true;
    if (state.qrAbort.signal.aborted) state.qrAbort = new AbortController();
    const epoch = ++state.epoch;
    initialRead.current ??= state.onRead();
    void initialRead.current
      .then((result) => {
        if (state.alive && state.epoch === epoch && result) setCatalog(result);
      })
      .catch(() => {
        if (state.alive && state.epoch === epoch)
          setError(wondercardWords[state.lang].error);
      });
    return () => {
      state.alive = false;
      state.epoch++;
      state.qrAbort.abort();
      for (const [url, timer] of state.downloads) {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      }
      state.downloads.clear();
      if (state.ticket) void state.onDiscard(state.ticket.token);
    };
    // Language changes translate existing catalog; they do not discard a draft.
  }, []);
  const frame = ticket?.result ?? catalog,
    locked = busy || pending,
    editable = !!catalog?.canEdit && !locked;
  const current = frame?.album[selected];
  async function operation(action: () => Promise<void>) {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    setError("");
    try {
      await action();
    } catch {
      if (life.current.alive) setError(w.error);
    } finally {
      flight.current = false;
      if (life.current.alive) setPending(false);
    }
  }
  async function preview(next: WondercardAction[], sourceCue = false) {
    if (!catalog || !editable) return;
    await operation(async () => {
      const state = life.current,
        epoch = state.epoch;
      if (state.ticket) await onDiscard(state.ticket.token);
      state.ticket = undefined;
      if (state.alive) setTicket(undefined);
      const result = await onPreview(wondercardRequest(catalog, next));
      if (!state.alive || state.epoch !== epoch) {
        if (result) await onDiscard(result.token);
        return;
      }
      if (!result) return;
      try {
        wondercardConfirmation(catalog, result, true);
      } catch (e) {
        await onDiscard(result.token);
        throw e;
      }
      state.ticket = result;
      setTicket(result);
      setActions(next);
      setAccept(false);
      setQrImage("");
      if (sourceCue) playSaveSound("other");
    });
  }
  async function inspect(data: string, fileName: string, qr: boolean) {
    const state = life.current,
      epoch = state.epoch;
    const entry = await onInspect(data, fileName, qr);
    if (state.alive && state.epoch === epoch && entry) {
      setImported({ entry, data, fileName, qr });
      setQrImage("");
    }
  }
  async function openFile(file: File) {
    await operation(async () => {
      if (file.size < 1 || file.size > 1024 * 1024)
        throw new Error("Invalid gift file size");
      const state = life.current,
        epoch = state.epoch;
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!state.alive || state.epoch !== epoch) return;
      let binary = "";
      for (const value of bytes) binary += String.fromCharCode(value);
      await inspect(btoa(binary), file.name, false);
    });
  }
  async function cancel() {
    await operation(async () => {
      if (life.current.ticket) await onDiscard(life.current.ticket.token);
      if (life.current.alive) {
        life.current.ticket = undefined;
        setTicket(undefined);
        setActions([]);
        setAccept(false);
        setQrImage("");
      }
    });
  }
  async function apply() {
    if (!catalog || !ticket) return;
    await operation(async () => {
      if (await onApply(wondercardConfirmation(catalog, ticket, accept))) {
        life.current.ticket = undefined;
        if (life.current.alive) {
          setTicket(undefined);
          setActions([]);
        }
      }
    });
  }
  function download(data: string, name: string) {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(
      new Blob([bytes], { type: "application/octet-stream" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    const state = life.current;
    state.downloads.set(
      url,
      setTimeout(() => {
        URL.revokeObjectURL(url);
        state.downloads.delete(url);
      }, 30000),
    );
  }
  async function generateQR(index: number, entry: WondercardEntry) {
    await operation(async () => {
      const state = life.current,
        epoch = state.epoch;
      const value = await onQR(index, entry);
      if (!value || !state.alive || epoch !== state.epoch) return;
      const image = await encodeQRImage(value, state.qrAbort.signal);
      if (state.alive && epoch === state.epoch) {
        setQrText(value);
        setQrImage(image);
      }
    });
  }
  function flag(value: boolean) {
    if (!/^\d+$/.test(received)) {
      setError(w.error);
      return;
    }
    void preview([
      ...actions,
      { kind: "received", index: Number(received), value },
    ]);
  }
  return (
    <section
      className="save-wondercard-editor"
      aria-label={w.title}
      aria-busy={locked}
    >
      <h3>{w.title}</h3>
      {error && (
        <p role="alert" className="save-editor-error">
          {w.error}
        </p>
      )}
      {pending && <p role="status">{w.pending}</p>}
      {!catalog || !frame ? (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={locked}
            onClick={() =>
              void operation(async () => {
                const result = await onRead();
                if (life.current.alive) setCatalog(result);
              })
            }
          >
            {w.read}
          </button>
        </div>
      ) : (
        <>
          <div className="save-wondercard-workspace">
            <div
              className="save-wondercard-album"
              role="group"
              aria-label={w.title}
            >
              {frame.album.map((entry) => (
                <button
                  type="button"
                  className="save-wondercard-slot"
                  key={entry.index}
                  aria-pressed={selected === entry.index}
                  data-used={entry.used}
                  disabled={locked}
                  onClick={() => {
                    setSelected(entry.index);
                    setQrImage("");
                  }}
                  draggable={!entry.empty && editable}
                  onDragStart={(e) =>
                    e.dataTransfer.setData(
                      "application/x-pokerngkit-gift",
                      String(entry.index),
                    )
                  }
                  onDragOver={(e) => {
                    if (editable) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!editable) return;
                    const source = e.dataTransfer.getData(
                      "application/x-pokerngkit-gift",
                    );
                    if (/^\d+$/.test(source))
                      void preview([
                        ...actions,
                        {
                          kind: "swap",
                          source: Number(source),
                          index: entry.index,
                        },
                      ]);
                    else if (e.dataTransfer.files[0]) {
                      setDestination(entry.index);
                      void openFile(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <WondercardImage entry={entry} lang={lang} />
                  <span>
                    {entry.index + 1} · {entry.type}
                  </span>
                  <small>
                    {entry.empty
                      ? w.empty
                      : entry.cardId >= 0
                        ? `#${entry.cardId}`
                        : entry.title}
                  </small>
                </button>
              ))}
            </div>
            {current && (
              <div className="save-wondercard-details">
                <h3>
                  {w.selected} {selected + 1}
                </h3>
                <WondercardImage entry={current} lang={lang} />
                <p>{current.title}</p>
                <ul>
                  {current.description.map((line, i) => (
                    <li key={i}>{line[lang]}</li>
                  ))}
                </ul>
                {current.error && (
                  <p className="save-editor-error">
                    {w.error} ({current.error})
                  </p>
                )}
                <div className="save-editor-toolbar">
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() =>
                      download(
                        current.data,
                        current.fileName ||
                          `gift.${current.type.toLowerCase()}`,
                      )
                    }
                  >
                    {w.export}
                  </button>
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() =>
                      void preview([
                        ...actions,
                        { kind: "delete", index: selected },
                      ])
                    }
                  >
                    {w.delete}
                  </button>
                  {frame.canUse && (
                    <button
                      type="button"
                      disabled={!editable}
                      onClick={() =>
                        void preview([
                          ...actions,
                          {
                            kind: "used",
                            index: selected,
                            value: !current.used,
                          },
                        ])
                      }
                    >
                      {current.used ? w.markUnused : w.markUsed}
                    </button>
                  )}
                </div>
                <label className="field">
                  <span>{w.destination}</span>
                  <Select
                    value={destination}
                    disabled={!editable}
                    onChange={(e) => setDestination(Number(e.target.value))}
                  >
                    {frame.album.map((entry) => (
                      <option key={entry.index} value={entry.index}>
                        {entry.index + 1} · {entry.type}
                      </option>
                    ))}
                  </Select>
                </label>
                <div className="save-editor-toolbar">
                  <button
                    type="button"
                    disabled={!editable || current.empty}
                    onClick={() =>
                      void preview([
                        ...actions,
                        { kind: "copy", source: selected, index: destination },
                      ])
                    }
                  >
                    {w.copy}
                  </button>
                  <button
                    type="button"
                    disabled={!editable || current.empty}
                    onClick={() =>
                      void preview([
                        ...actions,
                        { kind: "swap", source: selected, index: destination },
                      ])
                    }
                  >
                    {w.move}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="save-editor-toolbar">
            <label className="save-editor-file" aria-disabled={locked}>
              {w.import}
              <input
                type="file"
                disabled={locked}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void openFile(file);
                }}
              />
            </label>
            {frame.canUse && (
              <>
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() =>
                    void preview(
                      [...actions, { kind: "usedAll", value: true }],
                      true,
                    )
                  }
                >
                  {w.allUsed}
                </button>
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() =>
                    void preview(
                      [...actions, { kind: "usedAll", value: false }],
                      true,
                    )
                  }
                >
                  {w.allUnused}
                </button>
              </>
            )}
          </div>
          {imported && (
            <div className="save-wondercard-import">
              <h3>{w.imported}</h3>
              <WondercardImage entry={imported.entry} lang={lang} />
              <p>
                {imported.entry.title} · {imported.entry.type}
              </p>
              <ul>
                {imported.entry.description.map((line, i) => (
                  <li key={i}>{line[lang]}</li>
                ))}
              </ul>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={locked}
                  onClick={() =>
                    download(
                      imported.entry.data,
                      imported.entry.fileName ||
                        `gift.${imported.entry.type.toLowerCase()}`,
                    )
                  }
                >
                  {w.export}
                </button>
                {frame.canUse && (
                  <button
                    type="button"
                    disabled={locked || imported.entry.empty}
                    onClick={() => void generateQR(-1, imported.entry)}
                  >
                    {w.qr}
                  </button>
                )}
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() =>
                    void preview([
                      ...actions,
                      {
                        kind: imported.qr ? "qrSet" : "set",
                        index: destination,
                        data: imported.data,
                        fileName: imported.fileName,
                      },
                    ])
                  }
                >
                  {w.set}
                </button>
                {!imported.qr && (
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() =>
                      void preview([
                        ...actions,
                        {
                          kind: "drop",
                          index: destination,
                          data: imported.data,
                          fileName: imported.fileName,
                        },
                      ])
                    }
                  >
                    {w.drop}
                  </button>
                )}
              </div>
            </div>
          )}
          <fieldset className="save-editor-fields">
            <legend>{w.received}</legend>
            <label className="field">
              <span>
                {w.cardId} (0–{frame.flagMax - 1})
              </span>
              <input
                inputMode="numeric"
                maxLength={4}
                value={received}
                disabled={!editable}
                onChange={(e) => setReceived(e.target.value)}
              />
            </label>
            <label className="field">
              <span>{w.received}</span>
              <Select
                value=""
                disabled={!editable}
                onChange={(e) => setReceived(e.target.value)}
              >
                <option value="">{w.received}</option>
                {frame.received.map((id) => (
                  <option key={id} value={id}>
                    {String(id).padStart(4, "0")}
                  </option>
                ))}
              </Select>
            </label>
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={!editable}
                onClick={() => flag(true)}
              >
                {w.addFlag}
              </button>
              <button
                type="button"
                disabled={!editable}
                onClick={() => flag(false)}
              >
                {w.removeFlag}
              </button>
            </div>
          </fieldset>
          {frame.canUse && (
            <div className="save-wondercard-import">
              <label className="field">
                <span>{w.qrText}</span>
                <textarea
                  value={qrText}
                  maxLength={8192}
                  disabled={locked}
                  onChange={(e) => setQrText(e.target.value)}
                />
              </label>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  disabled={locked || !qrText}
                  onClick={() =>
                    void operation(() => inspect(qrText, "", true))
                  }
                >
                  {w.parseQR}
                </button>
                <button
                  type="button"
                  disabled={locked || !current || current.empty}
                  onClick={() => {
                    if (current) void generateQR(selected, current);
                  }}
                >
                  {w.qr}
                </button>
              </div>
              <div className="save-editor-toolbar">
                <label className="save-editor-file" aria-disabled={locked}>
                  {w.qrImage}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/bmp,image/gif"
                    disabled={locked}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file)
                        void operation(async () => {
                          const state = life.current,
                            epoch = state.epoch;
                          const text = await decodeQRImage(
                            file,
                            state.qrAbort.signal,
                          );
                          if (state.alive && epoch === state.epoch) {
                            setQrText(text);
                            await inspect(text, "", true);
                          }
                        });
                    }}
                  />
                </label>
                {qrImage && (
                  <a
                    className="save-editor-file"
                    href={qrImage}
                    download="wondercard-qr.png"
                  >
                    {w.qrExport}
                  </a>
                )}
              </div>
              {qrImage && (
                <img className="save-wondercard-qr" src={qrImage} alt={w.qr} />
              )}
            </div>
          )}
          {ticket && (
            <>
              <h3>
                {w.preview} · {w.steps}: {actions.length} · {w.bytes}:{" "}
                {ticket.changedOffsets.length}
              </h3>
              <div className="save-wondercard-diff">
                <table>
                  <thead>
                    <tr>
                      <th>{w.destination}</th>
                      <th>{w.before}</th>
                      <th>{w.after}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticket.result.album
                      .filter(
                        (entry, i) =>
                          entry.data !== ticket.before.album[i].data,
                      )
                      .map((entry) => (
                        <tr key={entry.index}>
                          <td>{entry.index + 1}</td>
                          <td>
                            {ticket.before.album[entry.index].title} · #
                            {ticket.before.album[entry.index].cardId}
                          </td>
                          <td>
                            {entry.title} · #{entry.cardId}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p>
                {w.before}: {ticket.before.received.join(", ")}
              </p>
              <p>
                {w.after}: {ticket.result.received.join(", ")}
              </p>
              {ticket.issues.map((issue) => (
                <p key={issue} className="save-editor-note">
                  {issue === "lgpe-received-clear-source-offset"
                    ? w.sourceIssue
                    : issue === "pcd-to-pgt-alternate-slot"
                      ? w.convertIssue
                      : issue}
                </p>
              ))}
              {ticket.issues.length > 0 && (
                <label className="save-editor-review">
                  <input
                    type="checkbox"
                    checked={accept}
                    disabled={locked}
                    onChange={(e) => setAccept(e.target.checked)}
                  />
                  {w.accept}
                </label>
              )}
            </>
          )}
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={!editable}
              onClick={() => void preview([...actions, { kind: "save" }])}
            >
              {w.save}
            </button>
            {ticket && (
              <>
                <button
                  type="button"
                  className="primary"
                  disabled={locked || (ticket.issues.length > 0 && !accept)}
                  onClick={() => void apply()}
                >
                  {w.apply}
                </button>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => void cancel()}
                >
                  {w.discard}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
