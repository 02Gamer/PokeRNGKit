import { useEffect, useRef, useState } from "react";
import {
  chatterBytes,
  chatterConfirmation,
  chatterImport,
  chatterInitialized,
  chatterRequest,
  chatterWords,
  validateChatterCatalog,
  type ChatterAction,
  type ChatterCatalog,
  type ChatterConfirmation,
  type ChatterRequest,
  type ChatterTicket,
} from "./chatter";
import "./ChatterEditor.css";
type Props = {
  revision: number;
  busy: boolean;
  lang: "zh" | "en" | "ja";
  onRead(): Promise<ChatterCatalog | undefined>;
  onPreview(request: ChatterRequest): Promise<ChatterTicket | undefined>;
  onApply(confirmation: ChatterConfirmation): Promise<boolean>;
  onDiscard(token: string): Promise<void>;
};
export function ChatterEditor(props: Props) {
  return <Form key={props.revision} {...props} />;
}
function Form({ busy, lang, onRead, onPreview, onApply, onDiscard }: Props) {
  const w = chatterWords[lang];
  const [catalog, setCatalog] = useState<ChatterCatalog>(),
    [ticket, setTicket] = useState<ChatterTicket>(),
    [actions, setActions] = useState<ChatterAction[]>([]),
    [pending, setPending] = useState(false),
    [playing, setPlaying] = useState(false),
    [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement>(null),
    input = useRef<HTMLInputElement>(null),
    flight = useRef(false),
    lifecycle = useRef({
      alive: true,
      epoch: 0,
      ticket: undefined as ChatterTicket | undefined,
      onRead,
      onDiscard,
      lang,
      downloads: new Map<string, ReturnType<typeof setTimeout>>(),
    });
  const request = useRef<Promise<ChatterCatalog | undefined> | undefined>(
    undefined,
  );
  useEffect(() => {
    lifecycle.current.onRead = onRead;
    lifecycle.current.onDiscard = onDiscard;
    lifecycle.current.lang = lang;
  }, [onRead, onDiscard, lang]);
  useEffect(() => {
    const life = lifecycle.current;
    life.alive = true;
    const token = life.epoch;
    request.current ??= life.onRead();
    void request.current
      .then((value) => {
        if (life.alive && token === life.epoch && value)
          setCatalog(validateChatterCatalog(value));
      })
      .catch(() => {
        if (life.alive && token === life.epoch)
          setError(chatterWords[life.lang].invalid);
      });
    return () => {
      life.alive = false;
      life.epoch++;
      if (life.ticket) void life.onDiscard(life.ticket.token);
      for (const [url, timer] of life.downloads) {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      }
      life.downloads.clear();
    };
  }, []);
  const frame = ticket?.result ?? catalog,
    locked = busy || pending;
  const mediaReady = !!frame && (!actions.length || !!ticket);
  const wave = frame?.wav;
  useEffect(() => {
    const element = audio.current;
    if (!element || !wave) return;
    const url = URL.createObjectURL(
      new Blob([chatterBytes(wave, 2044)], { type: "audio/wav" }),
    );
    element.src = url;
    return () => {
      element.pause();
      element.removeAttribute("src");
      element.load();
      URL.revokeObjectURL(url);
    };
  }, [wave]);
  function stop() {
    const element = audio.current;
    if (element) {
      element.pause();
      element.currentTime = 0;
    }
    setPlaying(false);
  }
  async function readAgain() {
    if (locked || flight.current) return;
    flight.current = true;
    setPending(true);
    const life = lifecycle.current,
      epoch = life.epoch;
    try {
      const value = await onRead();
      if (life.alive && epoch === life.epoch && value)
        setCatalog(validateChatterCatalog(value));
    } catch {
      if (life.alive && epoch === life.epoch) setError(w.invalid);
    } finally {
      flight.current = false;
      if (life.alive) setPending(false);
    }
  }
  async function preview(next: ChatterAction[]) {
    if (!catalog || locked || flight.current) return;
    let edit: ChatterRequest;
    try {
      edit = chatterRequest(catalog, next);
    } catch {
      setError(w.invalid);
      return;
    }
    stop();
    flight.current = true;
    setPending(true);
    setError("");
    setActions(next);
    setTicket(undefined);
    lifecycle.current.ticket = undefined;
    const life = lifecycle.current,
      epoch = life.epoch;
    try {
      const result = await onPreview(edit);
      if (!life.alive || epoch !== life.epoch) {
        if (result) await onDiscard(result.token);
        return;
      }
      if (result) {
        chatterConfirmation(catalog, result);
        life.ticket = result;
        setTicket(result);
      }
    } catch {
      if (life.alive) setError(w.invalid);
    } finally {
      flight.current = false;
      if (life.alive) setPending(false);
    }
  }
  async function importFile(file: File) {
    if (locked || flight.current || !catalog?.canEdit) return;
    if (file.size !== 1000) {
      setError(w.invalid);
      return;
    }
    const life = lifecycle.current,
      epoch = life.epoch;
    // Guard the asynchronous file read separately from the Worker preview.
    flight.current = true;
    setPending(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!life.alive || epoch !== life.epoch) return;
      const action = chatterImport(bytes);
      flight.current = false;
      setPending(false);
      await preview([...actions, action]);
    } catch {
      if (life.alive) setError(w.invalid);
    } finally {
      flight.current = false;
      if (life.alive) setPending(false);
    }
  }
  async function discard() {
    if (locked || flight.current) return;
    stop();
    flight.current = true;
    setPending(true);
    const life = lifecycle.current;
    try {
      if (life.ticket) await onDiscard(life.ticket.token);
      if (life.alive) {
        life.ticket = undefined;
        setTicket(undefined);
        setActions([]);
        setError("");
      }
    } finally {
      flight.current = false;
      if (life.alive) setPending(false);
    }
  }
  async function apply() {
    if (!catalog || !ticket || locked || flight.current) return;
    stop();
    flight.current = true;
    setPending(true);
    const life = lifecycle.current;
    try {
      if ((await onApply(chatterConfirmation(catalog, ticket))) && life.alive) {
        life.ticket = undefined;
        setTicket(undefined);
        setActions([]);
      }
    } catch {
      if (life.alive) setError(w.stale);
    } finally {
      flight.current = false;
      if (life.alive) setPending(false);
    }
  }
  async function play() {
    const element = audio.current;
    if (!mediaReady || !frame?.canPlay || locked || !element) return;
    const life = lifecycle.current,
      epoch = life.epoch,
      source = element.src;
    try {
      element.currentTime = 0;
      await element.play();
    } catch {
      if (life.alive && epoch === life.epoch && element.src === source)
        setError(w.playback);
    }
  }
  function download(format: "pcm" | "wav") {
    if (!frame || !mediaReady || locked) return;
    const bytes = chatterBytes(
      format === "pcm" ? frame.pcm : frame.wav,
      format === "pcm" ? 1000 : 2044,
    );
    const url = URL.createObjectURL(
      new Blob([bytes], {
        type: format === "wav" ? "audio/wav" : "application/octet-stream",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `Recording.${format}`;
    link.click();
    const life = lifecycle.current;
    life.downloads.set(
      url,
      setTimeout(() => {
        URL.revokeObjectURL(url);
        life.downloads.delete(url);
      }, 30000),
    );
  }
  return (
    <section className="save-chatter-editor" aria-label={w.title}>
      <h3>{w.title}</h3>
      <audio
        ref={audio}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      {!catalog ? (
        <div className="save-editor-toolbar">
          <button
            type="button"
            disabled={locked}
            onClick={() => void readAgain()}
          >
            {w.read}
          </button>
        </div>
      ) : (
        <>
          <div className="save-chatter-fields">
            <label className="save-editor-review">
              <input
                type="checkbox"
                checked={chatterInitialized(catalog, actions)}
                disabled={locked || !catalog.canEdit}
                onChange={(event) =>
                  void preview([
                    ...actions,
                    { kind: "initialized", initialized: event.target.checked },
                  ])
                }
              />
              {w.initialized}
            </label>
            <div className="field">
              <span>{w.chance}</span>
              <output>
                {pending || !mediaReady
                  ? w.pending
                  : `${frame?.confusionChance}%`}
              </output>
            </div>
          </div>
          <div className="save-editor-toolbar">
            <button
              type="button"
              disabled={locked || !mediaReady || !frame?.canPlay}
              onClick={() => void play()}
            >
              {w.play}
            </button>
            <button type="button" disabled={!playing} onClick={stop}>
              {w.stop}
            </button>
            <label
              className="save-editor-file"
              aria-disabled={locked || !catalog.canEdit}
            >
              {w.import}
              <input
                ref={input}
                type="file"
                accept=".pcm"
                disabled={locked || !catalog.canEdit}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void importFile(file);
                }}
              />
            </label>
            <button
              type="button"
              disabled={locked || !mediaReady}
              onClick={() => download("pcm")}
            >
              {w.exportPcm}
            </button>
            <button
              type="button"
              disabled={locked || !mediaReady}
              onClick={() => download("wav")}
            >
              {w.exportWav}
            </button>
          </div>
          {mediaReady && !frame?.canPlay && (
            <p className="save-editor-note">{w.empty}</p>
          )}
          <p className="save-editor-note">{w.note}</p>
          {!ticket && actions.length > 0 && (
            <div className="save-editor-toolbar">
              <button
                type="button"
                disabled={locked}
                onClick={() => void preview(actions)}
              >
                {w.preview}
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => void discard()}
              >
                {w.cancel}
              </button>
            </div>
          )}
          {ticket && (
            <section className="save-chatter-preview" aria-label={w.changes}>
              <h4>{w.changes}</h4>
              <dl className="save-editor-summary">
                <div>
                  <dt>{w.raw}</dt>
                  <dd>
                    {ticket.before.rawInitialized} →{" "}
                    {ticket.result.rawInitialized}
                  </dd>
                </div>
                <div>
                  <dt>{w.chance}</dt>
                  <dd>
                    {ticket.before.confusionChance}% →{" "}
                    {ticket.result.confusionChance}%
                  </dd>
                </div>
                <div>
                  <dt>{w.changedPcm}</dt>
                  <dd>{ticket.changedPcmBytes} / 1000</dd>
                </div>
                <div>
                  <dt>{w.changed}</dt>
                  <dd>{ticket.changedOffsets.length}</dd>
                </div>
              </dl>
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  className="primary"
                  disabled={locked || !ticket.changedOffsets.length}
                  onClick={() => void apply()}
                >
                  {w.confirm}
                </button>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => void discard()}
                >
                  {w.cancel}
                </button>
              </div>
            </section>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="save-editor-error">
          {error}
        </p>
      )}
    </section>
  );
}
